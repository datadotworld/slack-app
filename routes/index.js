const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Slack App' , content: 'Add slack button here.'});
});

module.exports = router;
