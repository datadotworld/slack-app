const { IncomingWebhook } = require('@slack/client');
const url = process.env.SLACK_WEBHOOK_URL;
const incomingWebhook = new IncomingWebhook(url);

/* Slack incomming webhook. */
router.post('/', function(req, res, next) {

  incomingWebhook.send('Hello there, incomingWebhook worked.', function(err, response) {
    if (err) {
      console.error('Error:', err);
      res.status(500).send(err.message);
    } else {
      console.log('Message sent: ', res);
      res.status(200).send("Success");
    }

  });
  
});

module.exports = router;