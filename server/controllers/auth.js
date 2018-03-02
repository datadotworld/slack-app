const SlackWebClient = require('@slack/client').WebClient;
const uuidv1 = require('uuid/v1');

const User = require('../models').User;
const { dataworld } = require('../api/dataworld');

const authUrl = process.env.AUTH_URL;
const slackBot = new SlackWebClient(process.env.SLACK_BOT_TOKEN);
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;

const auth = {

  verifySlackClient(req, res, next) {
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
    User.findOne({ where: { slackId: slackId , dwAccessToken :{$ne: null}} })
      .then((user) => {
        if (!user) {
          // Check user association 
          console.warn('User not found, no slack association...');
          return cb(null, false, null);
        }  
        return cb(null, true, user);
      })
      .catch((error) => {
        // log error message and send useful response to user
        console.error("checkSlackAssociationStatus error : ", error);
        console.log('Error finding user', error.message);
        return cb(error, false, null);
      }
    );
  },

  beginSlackAssociation(slackUserId, slackUsername, slackTeamId) {
    let nonce = uuidv1();
    return slackBot.im.open(slackUserId)
      .then((res) => {
        let dmChannelId = res.channel.id;
        let associationUrl = `${authUrl}${nonce}`;
        let slackMessage = slackBot.chat.postMessage(dmChannelId,
          `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources on data.world.`, {
            attachments: [{
              text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`,
            },],
          }
        );
        // create user with nonce and the slackdata        
        User.findOrCreate({
          where: { slackId: slackUserId },
          defaults: { teamId: slackTeamId, nonce : nonce}
        }).spread((user, created) => {
          console.log(user.get({
            plain: true
          }));
          if (!created) {
            // User record already exits.
            console.log("Found exsiting user record for slack user : ", slackUserId);
          }
        }).catch((error) => {
          // error creating user
          console.log("Failed to create new user : " + error.message);
          return;
        });

        return Promise.all([slackMessage]);        
      }).then(() => nonce);
  },

  completeSlackAssociation(req, res) {
    dataworld.exchangeAuthCode(req.query.code, (error, token) => {
      let nonce = req.query.state;
      if (token) {
        // use nonce to retrieve user 
        // Add returned token and expiry date to user model
        // redirect to success / homepage 
        User.findOne({ where: { nonce: nonce } })
          .then((user) => {
            user.update({ dwAccessToken: token }, { fields: ['dwAccessToken'] }).then(() => {
              res.status(201).send('success');
              //inform user via slack that authentication was successful
              slackBot.im.open(user.slackId)
                .then((res) => {
                  let dmChannelId = res.channel.id;
                  let slackMessage = slackBot.chat.postMessage(dmChannelId, 'Well, it\'s nice to meet you! Thanks for completing authentication.');
                  return Promise.all([slackMessage]);
                });
            });
          }).catch((error) => {
            res.status(400).send('failed');
          });
      } else {
        res.status(400).send('failed');
      }
    });
  },
};

module.exports = { auth };
