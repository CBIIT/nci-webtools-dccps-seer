import ini from 'ini';
import fs from 'fs';

import rWrapper from 'r-wrapper';
import { SQSClient } from '@aws-sdk/client-sqs';
import { getFile, putFile } from './services/aws.js';
import { processMessages } from './services/queue.js';
import { getLogger } from './services/logger.js';
import path from 'path';
import nodemailer from 'nodemailer';

import { extractArchive } from './services/utils.js';
import { createXLSX } from './services/xlsx.js';

const r = rWrapper.async;
const config = ini.parse(fs.readFileSync('../config/config.ini', 'utf-8'));

(async function main() {
  startQueueWorker();
})();

export async function startQueueWorker() {
  const sqs = new SQSClient({ region: config.sqs.region });

  const logger = getLogger('JPSurv.downloadQueue.log', {
    folder: config.logs.folder,
    level: config.logs.loglevel.toLowerCase(),
  });

  logger.info('Started JPSurv Download queue worker');

  processMessages({
    sqs,
    queueName: config.sqs.download_queue,
    visibilityTimeout: config.sqs.visibility_timeout || 300,
    pollInterval: config.sqs.queue_long_pull_time || 5,
    messageHandler: async (message) => {
      logger.info('Retrieved message from SQS queue');
      let { id, state, inputKey } = message;
      const { data, dataPath } = await getData(state, inputKey, config);

      let xlsxPath = await createXLSX(data, dataPath, state);
      

      try {
      } catch (exception) {
        logger.error(exception.stack);
      } finally {
      }
    },
    errorHandler: logger.error,
  });
}

// retrieve results for every model
async function getData(state, inputKey) {
  // download archive
  const archivePath = await getFile(inputKey, config);

  // extract archive
  const dataPath = await extractArchive(archivePath, config.folders.output_dir);

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

  return { data: await Promise.all(queries.flat()), dataPath: dataPath };
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
