const User = require('../models').User;
const { slack } = require('../api/slack');

const SlackWebClient = require('@slack/client').WebClient;
const uuidv1 = require('uuid/v1');

const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;
const authUrl = process.env.AUTH_URL;
const slackBot = new SlackWebClient(process.env.SLACK_BOT_TOKEN);

const commands = {
  '/test': "Test message received successfully"
};

//move to auth controller, and make this accessible to other controllers.
const beginSlackAssociation = (slackUserId, slackUsername, slackTeamId, slackTeamDomain) => {
  console.log('Starting association');
  const nonce = uuidv1();

  return slackBot.im.open(slackUserId)
    .then((res) => {
    	
      const dmChannelId = res.channel.id;
      const associationUrl = `${authUrl}${nonce}`

      const slackMessage = slackBot.chat.postMessage(dmChannelId,
        `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources on data.world.`, {
          attachments: [{
            text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`,
          }, ],
        }
      );
      // create user with nonce and the slackdata
      const newUser = User.create({
        slackId: slackUserId,
        teamId: slackTeamId,
        teamDomain: slackTeamDomain,
        nonce: nonce
      }).catch(error => {
        // error creating user
        console.log("Failed to create new user : " + error.message);
        return;
      })

      return Promise.all([slackMessage, newUser]);
    }).then(() => nonce);
}

const command = {

  verifySlack(req, res, next) {
    // Assumes this application is not distributed and can only be installed on one team.
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
    // respond to request immediately no need to wait.
    res.json({ response_type: 'in_channel' });

    // Authenticate the Slack user
    // An assumption is being made: all commands require authentication
    User.findOne({ where: { slackId: req.body.user_id } })
      .then((user) => {
        // A helpful message for commands that will not complete because of failed user auth
        if (!user) {
          // Start user association
          console.log('User not found');
          return beginSlackAssociation(req.body.user_id, req.body.user_name, req.body.team_id, req.body.team_domain)
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
        // log error message and send useful response to user
        console.log('Error finding user', error.message);
        return `Sorry <@${req.body.user_id}>, we're unable to process command \`${req.body.command}\` right now. Kindly, try again later.`;
      })
      .then(response => {
        if (response) {
          const data = { response_type: 'in_channel', text: response };
          slack.sendResponse(req.body.response_url, data);
        }
      });
  },
}
module.exports = { command };
