const express = require('express');
const router = express.Router();
const { command } = require('../controllers/command');
const { webhook } = require('../controllers/webhook');

module.exports = (passport) => {
	  router.post('/command', command.process);
	  router.get('/testhook', webhook.test);

	  return router;
}