const express = require('express');

const { auth } = require('../controllers/auth');
const { command } = require('../controllers/command');

const router = express.Router();

/* Slack command. */
router.post('/', auth.verifySlackClient, command.validate);

module.exports = router;