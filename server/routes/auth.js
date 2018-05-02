const express = require('express');

const { auth } = require('../controllers/auth');

const router = express.Router();

router.get('/exchange', auth.completeSlackAssociation);

// endpoint for handling slack app installation
router.get('/oauth', auth.slackOauth);

module.exports = router;