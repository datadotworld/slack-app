const express = require('express');
const router = express.Router();

/* Slack command. */
router.post('/', function(req, res, next) {
  console.log(req.body);
  res.send('Success');
});

module.exports = router;