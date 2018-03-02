const express = require('express');
const router = express.Router();

const { auth } = require('../controllers/auth');

router.get('/exchange', auth.complete);

module.exports = router;