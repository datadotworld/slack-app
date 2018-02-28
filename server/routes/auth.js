const express = require('express');
const router = express.Router();

const { auth } = require('../controllers/auth');

router.get('/code_callback', auth.complete);

module.exports = router;