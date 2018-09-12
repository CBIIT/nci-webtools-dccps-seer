var express = require('express');
var router = express.Router();
var multer  = require('multer');
var upload = multer({storage: multer.diskStorage({})});

/* GET users listing. */
router.post('/groupMetadata',
  upload.fields([{ name: 'seerDictionaryFile', maxCount: 1 }, { name: 'seerDataFile', maxCount: 1 }]) ,function(req, res, next) {
  console.log(req.files['seerDictionaryFile']);
  res.send('{ message: "groupMetadata respond with a resource"}');
});

router.post('/individualMetadata', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/groupData', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;