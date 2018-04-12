const express = require('express');

const { auth } = require('../controllers/auth');
const { unfurl } = require('../controllers/unfurl');

const router = express.Router();

/* Slack incomming webhook. */
router.post('/action', auth.verifySlackClient, unfurl.processRequest);

module.exports = router;