import ini from 'ini';
import fs from 'fs';
import XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import rWrapper from 'r-wrapper';
import { SQSClient } from '@aws-sdk/client-sqs';
import { getFile } from './services/aws.js';
import { processMessages } from './services/queue.js';
import { getLogger } from './services/logger.js';
import { arch } from 'os';
import path from 'path';
import nodemailer from 'nodemailer';
import { create } from 'domain';

(async function main() {
  const r = rWrapper.async;
  const config = ini.parse(fs.readFileSync('../config/config.ini', 'utf-8'));
  startQueueWorker(config);
})();

export async function startQueueWorker(config) {
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
      const { data, dataPath } = await getData(state, inputKey);

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
  const dataPath = await extractArchive(archivePath);

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

        const test = await r('../app/JPSurvWrapper.R', 'getAllData', [
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

async function extractArchive(filepath) {
  const zip = new AdmZip(filepath);
  const outputDir = config.folders.output_dir;

  zip.extractAllTo(outputDir);

  return path.join(config.folders.output_dir, path.parse(filepath).name);
}

async function createZipArchive(filepath, savepath) {
  const zip = new AdmZip();
  const outputFile = savepath;
  zip.addLocalFolder(filepath);
  zip.writeZip(outputFile);
  return savepath;
}

async function readTemplate(filePath, data) {
  const template = await fs.promises.readFile(path.resolve(filePath));

  // replace {tokens} with data values or removes them if not found
  return String(template).replace(
    /{[^{}]+}/g,
    (key) => data[key.replace(/[{}]+/g, '')] || ''
  );
}

function createXLSX(data, savePath, state) {
  // returns an array of cohort variables names
  function getCohorts() {
    return state.calculate.form.cohortVars.map(function (cohort) {
      return cohort
        .replace(/[^a-z\d/]/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[^a-z\d/]*|[^a-z\d/]*$/gi, '');
    });
  }

  function generateSheet(data, cohorts = false) {
    let dataMatrix = [];
    Object.entries(data).forEach(([key, values], col) => {
      values.forEach((value, row) => {
        if (!dataMatrix[row]) dataMatrix[row] = [];
        // fix NaN values
        if (isNaN(value) && typeof value != 'string')
          dataMatrix[row][col] = 'NA';
        else dataMatrix[row][col] = value;
      });
    });

    let sheet = [Object.keys(data), ...dataMatrix];
    if (cohorts) sheet.unshift(['Cohort', cohorts]);

    return XLSX.utils.aoa_to_sheet(sheet);
  }

  // Creates a sheet containing data from the Model Estimates tab
  function modelEstimates(results) {
    const modelSelection = results.ModelSelection;
    const jpLocations = results.JP;
    const jpInd = results.jpInd;
    const coefficients = results.Coefficients;
    const xvectors = coefficients.Xvectors.split(', ');
    const estimates = coefficients.Estimates.split(', ');
    const stdError = coefficients.Std_Error.split(', ');

    // Estimates of the Joinpoints
    var sheet = [['Estimates of the Joinpoints']];
    sheet.push(['Locations', jpLocations || 'None']);
    Object.values(modelSelection).forEach((jp, i) => {
      if (jpInd == i) {
        sheet.push(['Estimates', `Joinpoint ${i}`]);
        sheet.push(['Bayesian Information Criterion (BIC)', jp.aic]);
        sheet.push(['Akaike Information Criterial (AIC)', jp.bic]);
        sheet.push(['Log Likelihood', jp.ll]);
        sheet.push(['Converged', jp.converged ? 'Yes' : 'No'], []);
      }
    });

    // Coefficients
    sheet.push(['Coefficients']);
    sheet.push(['Parameter', 'Estimate (%)', 'Standard Error (%)']);
    xvectors.forEach((xvector, i) => {
      sheet.push([xvector, estimates[i], stdError[i]]);
    });

    // set column width
    var ws = XLSX.utils.aoa_to_sheet(sheet);
    var colWidth = [{ wch: 30 }, { wch: 25 }, { wch: 25 }];
    ws['!cols'] = colWidth;

    return ws;
  }

  // Creates a sheet containing selections for cohorts, model, and advanced options
  function settingsSheet(state) {
    const cohortVars = state.calculate.form.cohortVars;
    const cohortValues = state.calculate.form.cohortValues;
    const advOptions = state.calculate.static.advanced;
    const title = state.calculate.static.yearOfDiagnosisTitle;
    const range = state.calculate.form.yearOfDiagnosisRange;
    const interval = state.calculate.form.interval;
    const jp = state.calculate.form.maxjoinPoints;
    const options = [
      'Delete Last Interval',
      'Minimum Number of years between Joinpoints (Excluding Joinpoints)',
      'Minimum Number of Years before First Joinpoint (Excluding Joinpoint)',
      'Minimum Number of Years after Last Joinpoint (Excluding Joinpoint)',
      'Number of Calendar Years of Projected Survival',
    ];
    // table header
    let sheet = [['Cohort and Model Specifications']];

    // add settings and values
    sheet.push(['Year of Diagnosis', title]);
    sheet.push(['Year of Diagnosis Range', range[0] + ' - ' + range[1]]);
    sheet.push(['Max Intervals from Diagnosis to Include', interval]);
    for (let i in cohortVars) {
      sheet.push([cohortVars[i], cohortValues[i].replace(/\"/g, '')]);
    }
    sheet.push(['Maximum Joinpoints', jp], [], [], ['Advanced Options']);
    Object.keys(advOptions).forEach(function (key, i) {
      if (i == 0) {
        advOptions[key] == 'F'
          ? sheet.push([options[i], 'No'])
          : sheet.push([options[i], 'Yes']);
      } else {
        sheet.push([options[i], advOptions[key]]);
      }
    });

    // add selected model joinpoint information
    var currentJP = state.results.jpInd;
    var locations = state.results.jpLocation;
    if (!Array.isArray(locations)) locations = [locations];
    sheet.push(
      [],
      [],
      ['Model'],
      ['Number of joinpoints', currentJP.toString()],
      ['Joinpoint locations', locations[currentJP]],
      [],
      []
    );

    // covarariate input data
    const cohorts = Object.keys(state.covariates);
    sheet.push(['Covariates']);
    if (cohorts.length) {
      cohorts.forEach((cohort) =>
        sheet.push([cohort, state.covariates[cohort].join(', ')])
      );
    } else {
      sheet.push(['No cohorts available']);
    }

    // set column width
    var ws = XLSX.utils.aoa_to_sheet(sheet);
    var colWidth = [{ wch: 60 }, { wch: 10 }];
    ws['!cols'] = colWidth;

    return ws;
  }

  if (!Object.keys(data).length) throw 'Failed to retrieve results';

  let wb = XLSX.utils.book_new();
  wb.props = {
    Title: 'JPSurv-' + state.file.data.replace(/\.[^/.]+$/, ''),
  };

  data.forEach((data, i) => {
    let results = data.fullDownload;

    // add Observed_ProbDeath columns
    if (results['Relative_Survival_Interval']) {
      results['Observed_ProbDeath_Int'] = results[
        'Relative_Survival_Interval'
      ].map((i) => 100 - i);

      results['Observed_ProbDeath_Int_SE'] = results['Relative_SE_Interval'];
    } else {
      results['Observed_ProbDeath_Int'] = results[
        'CauseSpecific_Survival_Interval'
      ].map((i) => 100 - i);

      results['Observed_ProbDeath_Int_SE'] =
        results['CauseSpecific_SE_Interval'];
    }

    const yearVar = data.yearVar;
    let columns = [
      ...getCohorts(),
      yearVar,
      'Interval',
      'Died',
      'Alive_at_Start',
      'Lost_to_Followup',
      'Expected_Survival_Interval',
    ];

    // include input data depending on type of statistic
    if (state.additional.statistic == 'Relative Survival') {
      columns = [
        ...columns,
        'Expected_Survival_Cum',
        'Observed_Survival_Cum',
        'Observed_Survival_Interval',
        'Relative_Survival_Interval',
        'Observed_ProbDeath_Int',
        'Relative_Survival_Cum',
        'Relative_SE_Interval',
        'Relative_SE_Cum',
        'Observed_ProbDeath_Int_SE',
      ];
    } else {
      columns = [
        ...columns,
        'CauseSpecific_Survival_Interval',
        'Observed_ProbDeath_Int',
        'CauseSpecific_Survival_Cum',
        'CauseSpecific_SE_Interval',
        'CauseSpecific_SE_Cum',
        'Observed_ProbDeath_Int_SE',
      ];
    }

    // add predicted columns
    columns = [
      ...columns,
      'Predicted_Survival_Int',
      'Predicted_ProbDeath_Int',
      'Predicted_Survival_Cum',
      'Predicted_Survival_Int_SE',
      'Predicted_ProbDeath_Int_SE',
      'Predicted_Survival_Cum_SE',
    ];

    // filter in order of defined columns
    const filterData = columns
      .filter((e) => Object.keys(results).includes(e))
      .reduce((a, col) => ((a[col] = results[col]), a), {});

    const sheetname = `Cohort ${i + 1}`;
    let cohorts = state.calculate.form.cohortValues
      .map((v) => v.replace(/\"/g, ''))
      .join(' - ');
    const jp = data.jpInd;
    cohorts +=
      (cohorts.length ? ' - ' : '') +
      `Joinpoint ${jp}` +
      (jp > 0 ? ` (${data.jpLocation[jp]})` : '');

    XLSX.utils.book_append_sheet(
      wb,
      generateSheet(filterData, cohorts),
      sheetname
    );
  });
  data.forEach((data, i) =>
    XLSX.utils.book_append_sheet(
      wb,
      modelEstimates(data),
      'Model Estimates ' + ++i
    )
  );

  XLSX.utils.book_append_sheet(wb, settingsSheet(state), 'Settings');

  const file = path.join(savePath, wb.props.Title + '.xlsx');
  XLSX.writeFile(wb, file);

  return file;
}
