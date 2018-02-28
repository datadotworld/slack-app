const express = require('express');
const router = express.Router();
const { command } = require('../controllers/command');

/* Slack command. */
router.post('/', command.verifySlack, command.process);

module.exports = router;