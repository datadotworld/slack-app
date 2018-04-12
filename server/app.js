const express = require('express');
const config = require('./configs/config');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const command = require('./routes/command');
const webhook = require('./routes/webhook');
const auth = require('./routes/auth');
const unfurl = require('./routes/unfurl');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../build')));

app.use('/api/v1/command', command);
app.use('/api/v1/webhook', webhook);
app.use('/api/v1/auth', auth);
app.use('/api/v1/unfurl', unfurl);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).send();
});

module.exports = app;