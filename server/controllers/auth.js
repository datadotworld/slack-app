const SlackWebClient = require('@slack/client').WebClient;
const uuidv1 = require('uuid/v1');

const User = require('../models').User;
const { dataworld } = require('../api/dataworld');
const { slackapi } = require('../api/slack');

const authUrl = process.env.AUTH_URL;
const slack = new SlackWebClient(process.env.SLACK_CLIENT_TOKEN);
const slackBot = new SlackWebClient(process.env.SLACK_BOT_TOKEN);
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;

const auth = {

  slackOauth(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
      res.status(500);
      res.send({ "Error": "Looks like we're not getting code." });
      console.log("Looks like we're not getting code.");
    } else {
      // If it's there...
      // call slack api
      slackapi.oauthAccess(req.query.code).then((res) => {
          if (res.error) {
            console.log(res.error);
          } else{
            res.json(res.body);
          }
      });
    }
  },

  verifySlackClient(req, res, next) {
    if (req.body.challenge) {
      // Respond to slack challenge.
      return res.status(200).send({ "challenge": req.body.challenge });
    }
    // Assumes this application is not distributed and can only be installed on one team.
    // If this assumption does not hold true, then we would modify this code as well as
    // the data model to store individual team IDs, verification tokens, and access tokens.
    if (req.body.token === slackVerificationToken) {
      next();
    } else {
      next(new Error('Could not verify the request originated from Slack.'));
    }
  },

  checkSlackAssociationStatus(slackId, cb) {
    User.findOne({ where: { slackId: slackId, dwAccessToken: { $ne: null } } })
      .catch((error) => {
        // log error message and send useful response to user
        console.error('Error finding user', error.message);
        throw error;
      })
      .then((user) => {
        if (user) { // Check user association
          //user found, now verify token is active.
          dataworld.verifyDwToken(user.dwAccessToken).then(isValid => {
            if (isValid) {
              return cb(null, true, user);
            } else {
              return cb(null, false, null);
            }
          });
        } else {
          return cb(null, false, null);
        }
      });
  },

  beginSlackAssociation(slackUserId, slackUsername, slackTeamId) {
    let nonce = uuidv1();
    return slackBot.im.open(slackUserId)
      .then((res) => {
        const dmChannelId = res.channel.id;
        const associationUrl = `${authUrl}${nonce}`;
        slackBot.chat.postMessage(dmChannelId,
          `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources on data.world.`, {
            attachments: [{
              text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`,
            }, ],
          }
        );
        // create user with nonce and the slackdata        
        User.findOrCreate({
          where: { slackId: slackUserId },
          defaults: { teamId: slackTeamId, nonce: nonce }
        }).spread((user, created) => {
          if (!created) {
            // User record already exits.
            user.update({ nonce: nonce }, { fields: ['nonce'] });
          }
        }).catch((error) => {
          // error creating user
          console.error("Failed to create new user : " + error.message);
          throw error;
        });
      });
  },

  beginUnfurlSlackAssociation(userId, messageTs, channel, teamId) {
    const nonce = uuidv1();
    const associationUrl = `${authUrl}${nonce}`;
    let opts = {};
    let unfurls = {};

    opts.user_auth_required = true;
    opts.user_auth_url = associationUrl;

    return slack.chat.unfurl(messageTs, channel, unfurls, opts)
      .then(() => {
        // create user with nonce and the slackdata        
        User.findOrCreate({
          where: { slackId: userId },
          defaults: { teamId: teamId, nonce: nonce }
        }).spread((user, created) => {
          if (!created) {
            // User record already exits.
            //update nonce, reauthenticating existing user.
            user.update({ nonce: nonce }, { fields: ['nonce'] });
          }
        });
      }).catch(error => {
        console.error("Begin unfurl slack association error : ", error.message);
      });
  },

  completeSlackAssociation(req, res) {
    dataworld.exchangeAuthCode(req.query.code, (error, token) => {
      let nonce = req.query.state;
      if (token) {
        // use nonce to retrieve user 
        // Add returned token
        // redirect to success / homepage 
        User.findOne({ where: { nonce: nonce } })
          .then((user) => {
            user.update({ dwAccessToken: token }, { fields: ['dwAccessToken'] }).then(() => {
              res.status(201).send('success');
              //inform user via slack that authentication was successful
              const slackUserId = user.slackId;
              slackBot.im.open(slackUserId)
                .then((res) => {
                  const dmChannelId = res.channel.id;
                  let slackMessage = slackBot.chat.postMessage(dmChannelId,
                    `Well, it\'s nice to meet you, <@${slackUserId}>!. Thanks for completing authentication.`);
                });
            });
          }).catch((error) => {
            console.error(error);
            res.status(400).send('failed');
          });
      } else {
        res.status(400).send('failed');
      }
    });
  },
};

module.exports = { auth };
