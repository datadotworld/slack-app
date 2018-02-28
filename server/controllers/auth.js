const User = require('../models').User;
const uuidv1 = require('uuid/v1');

const auth = {
  complete(req, res) {
    res.send('success');
  },
};

module.exports = { auth };