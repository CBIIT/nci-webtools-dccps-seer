var express = require('express');
var multer = require('multer');
var util = require('util');
var R = require("../lib/r-script");

const SEER_DICTIONARY_FIELD_NAME = "seerDictionaryFile";
const SEER_DATA_FIELD_NAME = "seerDataFile";
const CANSURV_DATA_FIELD_NAME = "canSurvDataFile";
const SEER_CSV_DATA_FIELD_NAME = "seerCSVDataFile";

var router = express.Router();

var upload = multer({storage: multer.diskStorage({
        filename: (req, file, cb) => {
          var extension = "";
          var type = "none";

          if( file.fieldname == SEER_DICTIONARY_FIELD_NAME ) {
            extension = "dic";
            type = "dictionary";
          } else if (file.fieldname == SEER_DATA_FIELD_NAME) {
            extension = "txt";
            type = "data";
          } else if (file.fieldname == CANSURV_DATA_FIELD_NAME ||
            file.fieldname == SEER_CSV_DATA_FIELD_NAME ) {
            extension = "csv";
            type = "data";
          }

          var _filename = util.format('%s_%s.%s',req.requestId,type,extension);
          cb(null,_filename);
        }
    })
});

var groupMetadataFileUpload = upload.fields([
  { name: SEER_DICTIONARY_FIELD_NAME, maxCount: 1 },
  { name: SEER_DATA_FIELD_NAME, maxCount: 1 }
]);

var groupDataFileUpload = upload.fields([
  {name: SEER_DICTIONARY_FIELD_NAME, maxCount: 1},
  {name: SEER_DATA_FIELD_NAME, maxCount: 1},
  {name: CANSURV_DATA_FIELD_NAME, maxCount: 1 }
]);

var individualDataFileUpload = upload.fields([
  { name: SEER_CSV_DATA_FIELD_NAME, maxCount: 1 }
]);

var resolveWorkingDestination = (req,res,next) => {
  upload.storage.getDestination(req,null, (err,directory) => {
    if (err) return next(err);
    req.workingDirectory = directory;
    next();
  });
}

router.post('/groupMetadata', groupMetadataFileUpload, (req, res, next) => {
  console.log(req.requestId);

  var input = {
    'requestId': req.requestId,
    'seerDictionaryFile': req.files['seerDictionaryFile'][0]['path'],
    'seerDataFile': req.files['seerDataFile'][0]['path'],
    'method': 'handleGroupMetadata'
  };

  var result = R("R/recurrence.R").data(input).callSync();
  res.send(result);
});

router.post('/individualMetadata', individualDataFileUpload, function(req, res, next) {
  var input = {
    'requestId': req.requestId,
    'seerCSVDataFile': req.files['seerCSVDataFile'][0]['path'],
    'method': 'handleIndividualMetadata'
  };

  var result = R("R/recurrence.R").data(input).callSync();
  res.send(result);
});

router.post('/individualData', individualDataFileUpload, resolveWorkingDestination, (req, res, next) => {

  var input = {
      'requestId': req.requestId,
      'seerCSVDataFile': req.files['seerCSVDataFile'][0]['path'],
      'strata': req.body['strata'],
      'covariates': req.body['covariates'],
      'timeVariable': req.body['timeVariable'],
      'eventVariable': req.body['eventVariable'],
      'distribution': req.body['distribution'],
      'stageVariable': req.body['stageVariable'],
      'distantStageValue': req.body['distantStageValue'],
      'adjustmentFactor': req.body['adjustmentFactor'],
      'yearsOfFollowUp': req.body['yearsOfFollowUp'],
      'workingDirectory': req.workingDirectory,
      'mimeType': req.headers['accept'],
      'method': 'handleRecurrenceRiskIndividual'
    };

  try {
    //console.log(input);
    var result = R("R/recurrence.R").data(input).callSync();
    res.download(result.pop());
  } catch(error) {
    errors = error.split('\n');
    res.status(400).send(errors.pop());
  }
});

router.post('/groupData', groupDataFileUpload, resolveWorkingDestination, (req, res, next) => {
  var input = {
      'requestId': req.requestId,
      'seerDictionaryFile': req.files['seerDictionaryFile'][0]['path'],
      'seerDataFile': req.files['seerDataFile'][0]['path'],
      'canSurvDataFile': req.files['canSurvDataFile'][0]['path'],
      'stageVariable': req.body['stageVariable'],
      'stageValue': req.body['stageValue'],
      'adjustmentFactor': req.body['adjustmentFactor'],
      'yearsOfFollowUp': req.body['yearsOfFollowUp'],
      'workingDirectory': req.workingDirectory,
      'mimeType': req.headers['accept'],
      'method': 'handleRecurrenceRiskGroup'
    };

  try {
    var result = R("R/recurrence.R").data(input).callSync();
    res.download(result.pop());
  } catch(error) {
    errors = error.split('\n');
    res.status(400).send(errors.pop());
  }
});

module.exports = router;