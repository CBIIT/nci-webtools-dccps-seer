var express = require('express');
var multer = require('multer');
var util = require('util');
var R = require("../lib/r-script");

const SEER_DICTIONARY_FIELD_NAME = "seerDictionaryFile";
const SEER_DATA_FIELD_NAME = "seerDataFile";
const CANSURV_DATA_FIELD_NAME = "canSurvDataFile";

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
          } else if (file.fieldname == CANSURV_DATA_FIELD_NAME) {
            extension = "csv";
            type = "data";
          }

          var _filename = util.format('%s_%s.%s',req.requestId,type,extension);
          cb(null,_filename);
        }
    })
});


router.post('/groupMetadata',
  upload.fields([{ name: SEER_DICTIONARY_FIELD_NAME, maxCount: 1 }, { name: SEER_DATA_FIELD_NAME, maxCount: 1 }]) ,
  function(req, res, next) {

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

router.post('/individualMetadata', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/groupData', upload.fields( [{name: SEER_DICTIONARY_FIELD_NAME, maxCount: 1},
  {name: SEER_DATA_FIELD_NAME, maxCount: 1}, {name: CANSURV_DATA_FIELD_NAME, maxCount: 1 }] ),
  function(req, res, next) {

  console.log(req.requestId);
  var input = {
      'requestId': req.requestId,
      'seerDictionaryFile': req.files['seerDictionaryFile'][0]['path'],
      'seerDataFile': req.files['seerDataFile'][0]['path'],
      'canSurvDataFile': req.files['canSurvDataFile'][0]['path'],
      'stageVariable': req.body['stageVariable'],
      'stageValue': req.body['stageValue'],
      'adjustmentFactor': req.body['adjustmentFactor'],
      'yearsOfFollowUp': req.body['yearsOfFollowUp'],
      'method': 'handleRecurrenceRiskGroup'
    };
  var result = R("R/recurrence.R").data(input).callSync();
  res.send(result);
});

module.exports = router;