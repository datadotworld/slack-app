const express = require('express');

const { webhook } = require('../controllers/webhook');

const router = express.Router();

/* Endpoint to trigger/test Slack incomming webhook. */
router.get('/', webhook.send);

/* Listen for DW incomming webhook. */
router.post('/dw/events', webhook.process);

module.exports = router;