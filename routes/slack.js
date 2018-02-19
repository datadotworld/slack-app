const express = require('express');
const router = express.Router();
const { command } = require('../controllers/command');

module.exports = (passport) => {
	  router.post('/command', command.process);
	  return router;
}