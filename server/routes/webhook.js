const express = require('express');

const { webhook } = require('../controllers/webhook');

const router = express.Router();

/* Listen for DW incomming webhook. */
router.post('/dw/events', webhook.process);

module.exports = router;