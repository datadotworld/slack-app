const SlackWebClient = require("@slack/client").WebClient;
const uuidv1 = require("uuid/v1");

const User = require("../models").User;
const Team = require("../models").Team;
const { dataworld } = require("../api/dataworld");
const { slack } = require("../api/slack");

const authUrl = process.env.AUTH_URL;
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;

const auth = {
  slackOauth(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint.
    // If that code is not there, we respond with an error message
    console.log("req query : ", req.query);
    if (!req.query.code) {
      if (req.query.error === "access_denied") {
        console.warn("User denied oauth request.");
        return res.status(401).send();
      }
      console.log("Looks like we're not getting code.");
      res.status(500);
      res.send({ Error: "Looks like we're not getting code." });
    } else {
      // If it's there...
      // call slack api
      console.log("req query code : ", req.query.code);
      slack
        .oauthAccess(req.query.code)
        .then(response => {
          console.log("Slack oauth was successful : ", response.data);
          // create team with returned data
          Team.findOrCreate({
            where: { teamId: response.data.team_id },
            defaults: {
              teamDomain: response.data.team_name,
              accessToken: response.data.access_token,
              botUserId: response.data.bot.bot_user_id,
              botAccessToken: response.data.bot.bot_access_token
            }
          })
            .spread((team, created) => {
              if (!created) {
                // Team record already exits.
                // Update existing record with new data
                console.log("Team record already exist!, updating...");
                team.update(
                  {
                    teamDomain: response.data.team_name,
                    accessToken: response.data.access_token,
                    botUserId: response.data.bot.bot_user_id,
                    botAccessToken: response.data.bot.bot_access_token
                  },
                  {
                    fields: [
                      "teamDomain",
                      "accessToken",
                      "botUserId",
                      "botAccessToken"
                    ]
                  }
                );
              }
              console.log("Team added successfully!!!");
              let teamName = response.data.team_name;
              // deep link to slack app or redirect to slack team in web.
              res.redirect(`http://${teamName}.slack.com`);
            })
            .catch(error => {
              // error creating user
              console.error("Failed to create new Team : " + error.message);
              // redirect to failure page
              res.redirect(`${process.env.SLACK_APP_BASE_URL}/failed`);
            });
        })
        .catch(error => {
          console.error("Slack oauth failed : ", error);
          // redirect to failure page
          res.redirect(`${process.env.SLACK_APP_BASE_URL}failed`);
        });
    }
  },

  verifySlackClient(req, res, next) {
    if (req.body.challenge) {
      // Respond to slack challenge.
      return res.status(200).send({ challenge: req.body.challenge });
    }
    if (req.body.token === slackVerificationToken) {
      next();
    } else {
      next(new Error("Could not verify the request originated from Slack."));
    }
  },

  async checkSlackAssociationStatus(slackId) {
    try {
      const user = await User.findOne({
        where: { slackId: slackId, dwAccessToken: { $ne: null } }
      });
      let isValid = false;
      if (user) {
        // Check user association
        //user found, now verify token is active.
        let isValid = await dataworld.verifyDwToken(user.dwAccessToken);
      }
      return new Promise((resolve, reject) => {
        if (user && isValid) {
          // user has active token
          resolve(true, user);
        } else {
          // user not associated or token not valid
          resolve(false, user);
        }
      });
    } catch (error) {
      console.error("Error verifying slack association status : ", error);
      throw error;
    }
  },

  async beginSlackAssociation(slackUserId, slackUsername, teamId) {
    let nonce = uuidv1();
    const team = await Team.findOne({ where: { teamId: teamId } });
    const slackBot = new SlackWebClient(team.botAccessToken);

    slackBot.im.open(slackUserId).then(res => {
      const dmChannelId = res.channel.id;
      const associationUrl = `${authUrl}${nonce}`;
      slackBot.chat.postMessage(
        dmChannelId,
        `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources on data.world.`,
        {
          attachments: [
            {
              text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`
            }
          ]
        }
      );
      // create user with nonce and the slackdata
      User.findOrCreate({
        where: { slackId: slackUserId },
        defaults: { teamId: teamId, nonce: nonce }
      })
        .spread((user, created) => {
          if (!created) {
            // User record already exits.
            user.update({ nonce: nonce }, { fields: ["nonce"] });
          }
        })
        .catch(error => {
          // error creating user
          console.error("Failed to create new user : " + error.message);
          throw error;
        });
    }).catch(console.error);
  },

  async beginUnfurlSlackAssociation(userId, messageTs, channel, teamId) {
    const nonce = uuidv1();
    const associationUrl = `${authUrl}${nonce}`;
    let opts = {};
    let unfurls = {};

    opts.user_auth_required = true;
    opts.user_auth_url = associationUrl;

    const team = await Team.findOne({ where: { teamId: teamId } });
    const slackWebApi = new SlackWebClient(team.accessToken);

    slackWebApi.chat
      .unfurl(messageTs, channel, unfurls, opts) // With opts, this will prompt user to authenticate using the association Url above.
      .then(() => {
        // create user with nonce and the slackdata
        User.findOrCreate({
          where: { slackId: userId },
          defaults: { teamId: teamId, nonce: nonce }
        }).spread((user, created) => {
          if (!created) {
            // User record already exits.
            //update nonce, reauthenticating existing user.
            user.update({ nonce: nonce }, { fields: ["nonce"] });
          }
        });
      })
      .catch(error => {
        console.error("Begin unfurl slack association error : ", error.message);
      });
  },

  async completeSlackAssociation(req, res) {
    const res = await dataworld.exchangeAuthCode(req.query.code);
    if (res.error) {
      console.error("DW auth code exchange error : ", error);
      return res.status(400).send("failed");
    } else {
      const token = res.body.access_token;
      // use nonce to retrieve user
      // Add returned token
      // redirect to success / homepage
      try {
        const user = await User.findOne({ where: { nonce: nonce } });
        const team = await Team.findOne({ where: { teamId: user.teamId } });
        const slackBot = new SlackWebClient(team.botAccessToken);
        await user.update(
          { dwAccessToken: token },
          { fields: ["dwAccessToken"] }
        );
        res.status(201).send("success");

        //inform user via slack that authentication was successful
        const slackUserId = user.slackId;
        const botResponse = await slackBot.im.open(slackUserId);
        const dmChannelId = botResponse.channel.id;
        slackBot.chat.postMessage(
          dmChannelId,
          `Well, it\'s nice to meet you, <@${slackUserId}>!. Thanks for completing authentication.`
        );
      } catch (error) {
        console.error(error);
        return res.status(400).send("failed");
      }
    }
  }
};

module.exports = { auth };
