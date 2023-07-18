// use dynamic module imports while sharing script between browser and nodejs
// use module imports after converting backend entirely to node
// rename excel calls to XLSX
var excel = typeof XLSX === 'undefined' ? await import('xlsx') : XLSX;
if (typeof process === 'object') {
  var path = await import('path');
}

// download html table and includes settings sheet
export function exportTableWithSettings(type, state) {
  const tableId =
    type == 'survByYear' ? 'graph-year-table' : 'graph-time-table';
  const wb = excel.utils.table_to_book(document.getElementById(tableId));
  const cohort = state.results.Runs.trim()
    .split(' jpcom ')
    [state.results.com - 1].replace(/\s\+\s/g, ' - ');
  const jp = state.results.jpInd;
  const title = `${type} - Conditional Model ${jp + 1} (JP ${jp}) - ${cohort}`;

  excel.utils.book_append_sheet(wb, settingsSheet(state), 'Settings');
  excel.writeFile(wb, title + '.xlsx');
}

// export single tab results into xlsx
export async function singleExport(type, state = {}) {
  const cohort = state.results.Runs.trim()
    .split(' jpcom ')
    [state.results.com - 1].replace(/\s\+\s/g, ' - ');
  const jp = state.results.jpInd;
  let wb = excel.utils.book_new();

  wb.props = {
    Title: type + ' - Model ' + (jp + 1) + ' (JP ' + jp + ') - ' + cohort,
  };

  let columns = [...getCohorts(state), state.results.yearVar];
  // columns specific to each graph
  if (type == 'survByYear') {
    const survTable = state.results.yearData.survTable;
    columns.push(
      'Interval',
      'Relative_Survival_Cum',
      'Relative_SE_Cum',
      'CauseSpecific_Survival_Cum',
      'CauseSpecific_SE_Cum',
      'Predicted_Survival_Cum',
      'Predicted_Survival_Cum_SE'
    );

    // filter in order of defined columns
    const data = columns
      .filter((e) => Object.keys(survTable).includes(e))
      .reduce((a, col) => ((a[col] = survTable[col]), a), {});

    excel.utils.book_append_sheet(wb, generateSheet(data), 'Survival vs. Year');
  } else if (type == 'deathByYear') {
    const deathTable = state.results.deathData.deathTable;

    // change column names
    if (deathTable['Relative_Survival_Interval']) {
      deathTable['Observed_ProbDeath_Int'] = deathTable[
        'Relative_Survival_Interval'
      ].map(function (i) {
        return 100 - i;
      });

      deathTable['Observed_ProbDeath_Int_SE'] =
        deathTable['Relative_SE_Interval'];
    } else {
      deathTable['Observed_ProbDeath_Int'] = deathTable[
        'CauseSpecific_Survival_Interval'
      ].map(function (i) {
        return 100 - i;
      });

      deathTable['Observed_ProbDeath_Int_SE'] =
        deathTable['CauseSpecific_SE_Interval'];
    }
    columns.push(
      'Interval',
      'Observed_ProbDeath_Int',
      'Observed_ProbDeath_Int_SE',
      'Predicted_ProbDeath_Int',
      'Predicted_ProbDeath_Int_SE'
    );

    // filter in order of defined columns
    const data = columns
      .filter((e) => Object.keys(deathTable).includes(e))
      .reduce((a, col) => ((a[col] = deathTable[col]), a), {});

    excel.utils.book_append_sheet(wb, generateSheet(data), 'Death vs. Year');
  } else if (type == 'survByTime') {
    const timeTable = state.results.timeData.timeTable;

    columns.push(
      'Interval',
      'Relative_Survival_Cum',
      'CauseSpecific_Survival_Cum',
      'Predicted_Survival_Cum'
    );

    // filter in order of defined columns
    const data = columns
      .filter((e) => Object.keys(timeTable).includes(e))
      .reduce((a, col) => ((a[col] = timeTable[col]), a), {});

    excel.utils.book_append_sheet(wb, generateSheet(data), 'Survival vs. Time');
  }

  excel.utils.book_append_sheet(
    wb,
    modelEstimates(state.results),
    'Model Estimates'
  );
  excel.utils.book_append_sheet(wb, settingsSheet(state), 'Settings');

  excel.writeFile(wb, wb.props.Title + '.xlsx');
}

// export multiple cohort combinations into xlsx
export async function multiExport(
  resultsArray = [],
  savePath = '',
  state = {}
) {
  return new Promise((resolve, reject) => {
    try {
      if (!Object.keys(resultsArray).length) throw 'Failed to retrieve results';

      let wb = excel.utils.book_new();
      wb.props = {
        Title: 'JPSurv-' + state.file.dictionary.replace(/\.[^/.]+$/, ''),
      };

      const sheetData = resultsArray.reduce((accumulator, data, i) => {
        let results = data.fullDownload;

        // include model info
        const model = Object.values(data.ModelSelection)[data.jpInd];
        const dataLength = Object.values(results)[0].length;
        results = {
          ...results,
          'No. Jp': new Array(dataLength).fill(i),
          BIC: new Array(dataLength).fill(model.bic),
          'Final Model': new Array(dataLength).fill(
            (i == state.results.SelectedModel - 1) + ''
          ),
        };

        // add Observed_ProbDeath columns
        if (results['Relative_Survival_Interval']) {
          results['Observed_ProbDeath_Int'] = results[
            'Relative_Survival_Interval'
          ].map((i) => 100 - i);

          results['Observed_ProbDeath_Int_SE'] =
            results['Relative_SE_Interval'];
        } else {
          results['Observed_ProbDeath_Int'] = results[
            'CauseSpecific_Survival_Interval'
          ].map((i) => 100 - i);

          results['Observed_ProbDeath_Int_SE'] =
            results['CauseSpecific_SE_Interval'];
        }

        const yearVar = data.yearVar;
        let columns = [
          ...getCohorts(state),
          yearVar,
          'No. Jp',
          'BIC',
          'Final Model',
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
        const dataColumns = columns.filter((e) =>
          Object.keys(results).includes(e)
        );
        const filterData = dataColumns.reduce(
          (a, col) => (
            (a[col] = a[col] ? [...a[col], ...results[col]] : results[col]), a
          ),
          // (a, col) => ((a[col] = results[col]), a),
          accumulator
        );

        return filterData;
        // const sheetname = `Cohort ${i + 1}`;
        // const modelIndex = data.com - 1;
        // const cohort = data.Runs.trim()
        //   .split(' jpcom ')
        //   [modelIndex].replace(/\s\+\s/g, ' - ');

        // const jpInd = data.jpInd;
        // const jp = jpInd
        //   ? ` (${data.jpLocation[jpInd].replace(/\s/g, ', ')})`
        //   : '';

        // const modelInfo = [
        //   cohort ? cohort + ' - ' : '',
        //   `Joinpoint ${jpInd}`,
        //   jp,
        // ].join('');

        // excel.utils.book_append_sheet(
        //   wb,
        //   generateSheet(filterData, modelInfo),
        //   sheetname
        // );
      }, {});
      excel.utils.book_append_sheet(
        wb,
        generateSheet(sheetData, false),
        'data'
      );
      resultsArray.forEach((data, i) =>
        excel.utils.book_append_sheet(
          wb,
          modelEstimates(data),
          'Model Estimates ' + ++i
        )
      );

      excel.utils.book_append_sheet(wb, settingsSheet(state), 'Settings');

      //   write workbook to file if given a path
      if (savePath) {
        const filename = wb.props.Title + '.xlsx';
        const filepath = path.join(savePath, filename);
        excel.writeFile(wb, filepath);

        resolve(filename);
      } else resolve(wb);
    } catch (error) {
      reject(error);
    }
  });
}

// returns an array of cohort variables names
function getCohorts(state) {
  return state.calculate.form.cohortVars.map((cohort) =>
    cohort
      .replace(/[^a-z\d-]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[^a-z\d]*|[^a-z\d]*$/gi, '')
      .replaceAll('-', '')
  );
}

function generateSheet(data, cohorts = false) {
  let dataMatrix = [];
  Object.entries(data).forEach(([key, values], col) => {
    values.forEach((value, row) => {
      if (!dataMatrix[row]) dataMatrix[row] = [];
      // fix NaN values
      if (isNaN(value) && typeof value != 'string') dataMatrix[row][col] = 'NA';
      else dataMatrix[row][col] = value;
    });
  });

  let sheet = [Object.keys(data), ...dataMatrix];
  if (cohorts) sheet.unshift(['Cohort', cohorts]);

  return excel.utils.aoa_to_sheet(sheet);
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
      sheet.push(['Bayesian Information Criterion (BIC)', jp.bic]);
      sheet.push(['Akaike Information Criterial (AIC)', jp.aic]);
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
  var ws = excel.utils.aoa_to_sheet(sheet);
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
    cohorts.forEach((cohort) => {
      const covariates = state.covariates[cohort];
      Array.isArray(covariates) && covariates.length
        ? sheet.push([cohort, covariates.join(', ')])
        : sheet.push([cohort, covariates]);
    });
  } else {
    sheet.push(['No cohorts available']);
  }

  // set column width
  var ws = excel.utils.aoa_to_sheet(sheet);
  var colWidth = [{ wch: 60 }, { wch: 10 }];
  ws['!cols'] = colWidth;

  return ws;
}
