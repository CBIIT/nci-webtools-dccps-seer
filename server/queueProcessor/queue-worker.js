import ini from 'ini';
import fs from 'fs';
import rWrapper from 'r-wrapper';
import { SQSClient } from '@aws-sdk/client-sqs';
import { getFile, putFile } from './services/aws.js';
import { processMessages } from './services/queue.js';
import { getLogger } from './services/logger.js';
import path from 'path';
import nodemailer from 'nodemailer';

import { extractArchive, createArchive } from './services/utils.js';
import { createXLSX } from './services/xlsx.js';

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

        // main calculation
        const resultsFile = await calculate(state, dataPath);
        const results = {
          ...state,
          results: JSON.parse(await fs.promises.readFile(resultsFile)),
        };

        // process models
        const modelData = await calculateModels(results, dataPath);

        // generate full dataset xlsx
        const xlsxFile = await createXLSX(modelData, dataPath, results);

        // archive results
        const archiveFile = await putData(id + '.zip', dataPath);

        // specify email template variables
        const templateData = {
          timestamp: timestamp,
          resultsURL: state.queue.url,
          datasetURL: `${config.mail.baseURL}/api/queueDownloadResult?dataset=${xlsxFile}&archive=${archiveFile}`,
          files: `${state.file.dictionary}${
            state.file.data ? `, ${state.file.data}` : ''
          }`,
          admin_support: config.mail.admin_support,
        };

        logger.info(`Sending user success email`);
        await mailer.sendMail({
          from: config.mail.admin_support,
          to: email,
          subject: `JPSurv Calculation Results - ${state.file.data}`,
          html: await readTemplate(
            'templates/user_success_email.html',
            templateData
          ),
        });
      } catch (exception) {
        logger.error(`An error occured while processing - ${id}`);
        logger.error(exception.stack);
        // specify email template variables
        const templateData = {
          timestamp: timestamp,
          files: `${state.file.dictionary}${
            state.file.data ? `, ${state.file.data}` : ''
          }`,
          admin_support: config.mail.admin_support,
        };

        logger.info(`Sending user error email`);
        await mailer.sendMail({
          from: config.mail.admin_support,
          to: email,
          subject: `JPSurv Calculation Error - ${state.file.data}`,
          html: await readTemplate(
            'templates/user_error_email.html',
            templateData
          ),
        });
      }
    },
    errorHandler: logger.error,
  });
}

// main JPSurv calculation
async function calculate(state, path) {
  return await r('../app/JPSurvWrapper.R', 'getFittedResultWrapper', [
    path,
    JSON.stringify(state),
  ]);
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

      const resultsFile = path.join(
        dataPath,
        `results-${state.tokenId}-${cohortIndex + 1}-${jp}.json`
      );

      // load json result if file exists
      if (fs.existsSync(resultsFile)) {
        return await JSON.parse(await fs.promises.readFile(resultsFile));
      } else {
        // otherwise calculate model

        await r('../app/JPSurvWrapper.R', 'getAllData', [
          dataPath,
          JSON.stringify(params),
          false,
          true,
          path.join(dataPath, `cohortCombo-${state.tokenId}.json`),
        ]);

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
  return String(template).replace(
    /{[^{}]+}/g,
    (key) => data[key.replace(/[{}]+/g, '')] || ''
  );
}
