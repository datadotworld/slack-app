const User = require('../models').User;
const unirest = require('unirest');

const url = require('url');

const SlackWebClient = require('@slack/client').WebClient;
const uuidv1 = require('uuid/v1');

const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;
const authUrl = process.env.AUTH_URL;
const slack = new SlackWebClient(process.env.SLACK_BOT_TOKEN);

const commands = {
  '/test': "Test message received successfully"
};

const beginSlackAssociation = (slackUserId) => {
  console.log('Starting association');
  const nonce = uuidv1();

  return slack.im.open(slackUserId)
    .then((res) => {

      const dmChannelId = res.channel.id;
      const associationUrl = `${authUrl}${nonce}`

      const slackMessage = slack.chat.postMessage(dmChannelId,
        'Hello, new friend! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources.', {
          attachments: [{
            text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`,
          }, ],
        }
      );
      // create user with nonce 
      return Promise.all([slackMessage]);
    }).then(() => nonce);
}

const command = {

  verifySlack(req, res, next) {
    // Assumes this application is is not distributed and can only be installed on one team.
    // If this assumption does not hold true, then we would modify this code as well as
    // the data model to store individual team IDs, verification tokens, and access tokens.
    if (req.body.token === slackVerificationToken) {
      next();
    } else {
      next(new Error('Could not verify the request originated from Slack.'));
    }
  },

  process(req, res) {
    console.log(req.body);

    res.json({ response_type: 'in_channel' });

    // Authenticate the Slack user
    // An assumption is being made: all commands require authentication
    User.findOne({ where: { slackid: req.body.user_id } })
      .then((user) => {
        // A helpful message for commands that will not complete because of failed user auth
        if (!user) {
          // Start user association
          console.log('User not found');
          return beginSlackAssociation(req.body.user_id)
            .then(() => `Sorry <@${req.body.user_id}>, you cannot run \`${req.body.command}\` until after you authenticate. I can help you, just check my DM for the next step, and then you can try the command again.`);
        } else {
          // Execution of command
          console.log('Found user');
          const message = commands[req.body.command];
          if (!message) {
            throw new Error(`Cannot understand the command: \`${req.body.command}\``);
          }
          return message;
        }
      })
      .catch((error) => {
        // For all other errors, the in-channel response will be the error's message
        console.log('Error finding user');
        return error.message;
      })
      .then(response => {
        console.log('Using unirest');
        unirest.post(req.body.response_url)
          .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' })
          .send({
            response_type: 'in_channel',
            text: response,
          })
          .end(function(response) {
            console.log(response.body);
          });
      });
  },

}
module.exports = { command };
