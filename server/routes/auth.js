const express = require('express');

const { auth } = require('../controllers/auth');

const router = express.Router();

router.get('/exchange', auth.completeSlackAssociation);

router.get('/oauth', auth.slackOauth);

module.exports = router;