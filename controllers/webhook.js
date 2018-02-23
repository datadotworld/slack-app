const utility = require('../utils/util');
const { IncomingWebhook } = require('@slack/client');
const { ObjectID } = require('mongodb');
const _ = require('lodash');

const url = process.env.SLACK_WEBHOOK_URL;
const incomingWebhook = new IncomingWebhook(url);

const webhook = {

  test(req, res) {
    incomingWebhook.send('Hello there', function(err, response) {
      if (err) {
        console.error('Error:', err);
        res.status(500).send(err.message);
      } else {
        console.log('Message sent: ', res);
        res.status(200).send("Success");
      }

    });
  },

}
module.exports = { webhook };