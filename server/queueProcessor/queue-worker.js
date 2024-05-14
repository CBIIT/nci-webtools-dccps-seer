import ini from 'ini';
import fs from 'fs';
import { rm } from 'fs/promises';
import rWrapper from 'r-wrapper';
import { SQSClient } from '@aws-sdk/client-sqs';
import { deleteFile, getFile, putFile } from './services/aws.js';
import { processMessages } from './services/queue.js';
import { getLogger } from './services/logger.js';
import path from 'path';
import nodemailer from 'nodemailer';

import { extractArchive, createArchive } from './services/utils.js';
import { multiExport } from './services/xlsxExport.js';

const r = rWrapper.async;
const config = ini.parse(fs.readFileSync('../config/config.ini', 'utf-8'));
const logger = getLogger('queueProcessor.log', {
  folder: config.logs.folder,
  level: config.logs.loglevel.toLowerCase(),
});

(async function main() {
  startQueueWorker();
})();

export async function startQueueWorker() {
  logger.info('Started JPSurv queue worker');
  const sqs = new SQSClient({ region: config.sqs.region });
  const mailer = nodemailer.createTransport({
    host: config.mail.host,
    port: 25,
  });

  processMessages({
    sqs,
    queueName: config.sqs.queue_name,
    visibilityTimeout: config.sqs.visibility_timeout || 300,
    pollInterval: config.sqs.queue_long_pull_time || 5,
    messageHandler: async (message) => {
      logger.info('Retrieved message from SQS queue');

      const { id, state, inputKey, timestamp } = message;
      const email = state.queue.email;

      try {
        logger.info(`Processing - ${id}`);
        // download archive
        const archivePath = await getFile(inputKey, config);

        // extract archive
        const dataPath = extractArchive(archivePath, config.folders.output_dir);
        await rm(archivePath);

        // main calculation
        logger.info('main calculation');
        const resultsFile = path.resolve(dataPath, JSON.parse(await calculate(state, dataPath))[0]);
        const results = {
          ...state,
          results: JSON.parse(await fs.promises.readFile(resultsFile)),
        };

        // process models
        logger.info('process models');
        const modelData = await calculateModels(results, dataPath);

        // generate full dataset xlsx
        logger.info('generate full dataset download');
        const xlsxFile = await multiExport(modelData, dataPath, results);

        // archive results
        const archiveFile = await putData(id + '.zip', dataPath);
        await rm(dataPath, { recursive: true });
        // specify email template variables
        const templateData = {
          timestamp: timestamp,
          resultsURL: state.queue.url,
          datasetURL: `${config.mail.baseURL}/api/queueDownloadResult?dataset=${xlsxFile}&archive=${archiveFile}`,
          files: `${state.file.dictionary}${state.file.data ? `, ${state.file.data}` : ''}`,
          admin_support: config.mail.admin_support,
        };

        logger.info(`Sending user success email`);
        await mailer.sendMail({
          from: config.mail.admin_support,
          to: email,
          subject: `JPSurv Calculation Results - ${state.file.data || state.file.form}`,
          html: await readTemplate('templates/user_success_email.html', templateData),
        });
      } catch (exception) {
        logger.error(`An error occured while processing - ${id}`);
        logger.error(exception.stack);
        // specify email template variables
        const templateData = {
          timestamp: timestamp,
          files: `${state.file.dictionary}${state.file.data ? `, ${state.file.data}` : ''}`,
          admin_support: config.mail.admin_support,
        };

        logger.info(`Sending user error email`);
        await mailer.sendMail({
          from: config.mail.admin_support,
          to: email,
          subject: `JPSurv Calculation Error - ${state.file.data || state.file.form}`,
          html: await readTemplate('templates/user_error_email.html', templateData),
        });
      } finally {
        // delete input data from s3
        await deleteFile(inputKey, config);
      }
    },
    errorHandler: logger.error,
  });
}

// main JPSurv calculation
async function calculate(state, path) {
  return await r('../server/JPSurvWrapper.R', 'getFittedResultWrapper', [path, JSON.stringify(state)]);
}

// process models for all jp cohort combinations
async function calculateModels(state, dataPath) {
  // query json data results
  const cohorts = state.results.Runs.trim().split(' jpcom ');
  const models = Object.keys(state.results.ModelSelection);
  const queries = cohorts.map((cohort, cohortIndex) =>
    models.map(async (_, jp) => {
      let { results, ...params } = state;
      params.run = cohortIndex + 1;
      params.additional.headerJoinPoints = jp;
      params.calculate.form.cohortValues = cohort.split(' + ');
      params.viewConditional = false;

      const relaxProp = params.calculate.form.relaxProp;
      const filePrefix = params.viewConditional ? 'results-conditional' : 'results';
      const cutPointIndex = relaxProp ? `-${params.cutPointIndex}` : '';
      const resultsFile = path.join(
        dataPath,
        `${filePrefix}-${state.tokenId}-${cohortIndex + 1}-${jp}${cutPointIndex}.json`
      );

      // load json result if file exists
      if (fs.existsSync(resultsFile)) {
        return await JSON.parse(await fs.promises.readFile(resultsFile));
      } else {
        // otherwise calculate model
        if (relaxProp) {
          const maxCutPoint = +params.calculate.form.maxCutPoint;
          await Promise.all(
            [...Array(maxCutPoint).keys()].map((i) =>
              r('../server/JPSurvWrapper.R', 'relaxPropResults', [
                dataPath,
                JSON.stringify({ ...params, cutPointIndex: i + 1 }),
                false,
                path.join(dataPath, `cohortCombo-${state.tokenId}.json`),
              ])
            )
          );
        } else {
          await r('../server/JPSurvWrapper.R', 'getAllData', [
            dataPath,
            JSON.stringify(params),
            false,
            path.join(dataPath, `cohortCombo-${state.tokenId}.json`),
          ]);
        }

        return await JSON.parse(await fs.promises.readFile(resultsFile));
      }
    })
  );

  return await Promise.all(queries.flat());
}

// archive results and upload to s3 bucket
async function putData(filename, dataPath) {
  const zipBuffer = createArchive(dataPath, config.folders.output_dir);
  const uploadKey = path.join(config.s3.output_dir, filename);
  await putFile(zipBuffer, uploadKey, config);
  return filename;
}

/**
 * Reads a template, substituting {tokens} with data values
 * @param {string} filepath
 * @param {object} data
 */
async function readTemplate(filePath, data) {
  const template = await fs.promises.readFile(path.resolve(filePath));

  // replace {tokens} with data values or removes them if not found
  return String(template).replace(/{[^{}]+}/g, (key) => data[key.replace(/[{}]+/g, '')] || '');
}
