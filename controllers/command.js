const utility = require('../utils/util');
const { ObjectID } = require('mongodb');
const _ = require('lodash');

const command = {

  process(req, res) {
    console.log(req.body);
    res.send('Success');
  },

}
module.exports = { command };
