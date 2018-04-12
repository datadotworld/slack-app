const express = require('express');

const { webhook } = require('../controllers/webhook');

const router = express.Router();

/* Slack incomming webhook. */
router.get('/', webhook.send);

module.exports = router;