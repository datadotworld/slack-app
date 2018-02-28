const express = require('express');
const router = express.Router();
const { webhook } = require('../controllers/webhook');

/* Slack incomming webhook. */
router.get('/', webhook.send);

module.exports = router;