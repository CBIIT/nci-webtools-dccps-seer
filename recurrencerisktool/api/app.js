var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/recurrence');
const uuid = require('uuid/v1');

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use( (req,res,next) => {
  req.requestId = uuid();
  next();
});

app.use('/', indexRouter);
app.use('/recurrence', usersRouter);

app.use(function (err, req, res, next) {
  console.error(err.stack);
  console.error(err);
  res.status(500).send({message: "system error"});
});

module.exports = app;