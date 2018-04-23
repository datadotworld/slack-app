const { IncomingWebhook } = require('@slack/client');

const url = process.env.SLACK_WEBHOOK_URL;
const incomingWebhook = new IncomingWebhook(url);

const webhook = {
  send(req, res) {
    incomingWebhook.send('Hello there', (err, response) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).send(err.message);
      } else {
        res.status(200).send("Success");
      }
    });
  },

  process(req, res) {
    console.log('Incoming DW webhook event : ', req.body);
    res.status(200).send("Success");
  }
};
module.exports = { webhook };