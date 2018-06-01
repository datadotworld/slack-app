const SlackWebClient = require("@slack/client").WebClient;
const uuidv1 = require("uuid/v1");

const User = require("../models").User;
const Team = require("../models").Team;
const { dataworld } = require("../api/dataworld");
const { slack } = require("../api/slack");
const Sequelize = require("sequelize");

const Op = Sequelize.Op;
const authUrl = process.env.AUTH_URL;
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;

const auth = {
  slackOauth(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint.
    // If that code is not there, we respond with an error message
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
      const baseUrl = `${req.protocol}://${req.get("host")}`;
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
            .spread(async (team, created) => {
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
              console.log("team add response data : " + response.data);
              // deep link to slack app or redirect to slack team in web.
              res.redirect(
                `https://slack.com/app_redirect?app=${
                  process.env.SLACK_APP_ID
                }&team=${team.teamId}`
              );

              //inform user via slack that installation was successful
              const slackBot = new SlackWebClient(
                process.env.SLACK_BOT_TOKEN || team.botAccessToken
              );

              const slackUserId = response.data.user_id;
              const botResponse = await slackBot.im.open(slackUserId);
              const dmChannelId = botResponse.channel.id;
              slackBot.chat.postMessage(dmChannelId, "", {
                attachments: [
                  {
                    color: "#79B8FB",
                    text:
                      "You've successfully installed Data.World on this Slack workspace :tada: \n" +
                      "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
                      "• _/data.world subscribe account_ \n" +
                      "• _/data.world subscribe owner/dataset_ \n" +
                      "• _/data.world subscribe owner/project_"
                  },
                  {
                    color: "#79B8FB",
                    text: `Looking for additional help? Try /data.world help`
                  }
                ]
              });
            })
            .catch(error => {
              // error creating user
              console.error("Failed to create new Team : " + error.message);
              // redirect to failure page
              res.redirect(`${baseUrl}/failed`);
            });
        })
        .catch(error => {
          console.error("Slack oauth failed : ", error);
          // redirect to failure page
          res.redirect(`${baseUrl}failed`);
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
        where: { slackId: slackId, dwAccessToken: { [Op.ne]: null } }
      });
      let isAssociated = false;
      if (user) {
        // Check user association
        // User found, now verify token is active.
        isAssociated = await dataworld.verifyDwToken(user.dwAccessToken);
      }
      return [isAssociated, user];
    } catch (error) {
      console.error("Error verifying slack association status : ", error);
      throw error;
    }
  },

  async beginSlackAssociation(slackUserId, slackUsername, teamId) {
    try {
      let nonce = uuidv1();
      const team = await Team.findOne({ where: { teamId: teamId } });
      const slackBot = new SlackWebClient(
        process.env.SLACK_BOT_TOKEN || team.botAccessToken
      );

      slackBot.im
        .open(slackUserId)
        .then(res => {
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
        })
        .catch(console.error);
    } catch (error) {
      console.error("Begin slack association error : ", error);
    }
  },

  async beginUnfurlSlackAssociation(userId, messageTs, channel, teamId) {
    try {
      const nonce = uuidv1();
      const associationUrl = `${authUrl}${nonce}`;
      let opts = {};
      let unfurls = {};

      opts.user_auth_required = true;
      opts.user_auth_url = associationUrl;

      const team = await Team.findOne({ where: { teamId: teamId } });
      const slackWebApi = new SlackWebClient(
        process.env.SLACK_TEAM_TOKEN || team.accessToken
      );

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
          console.error(
            "Failed to send begin unfurl message to slack : ",
            error
          );
        });
    } catch (error) {
      console.error("Begin unfurl slack association error : ", error);
    }
  },

  async completeSlackAssociation(req, res) {
    try {
      const response = await dataworld.exchangeAuthCode(req.query.code);
      if (response.error) {
        console.error("DW auth code exchange error : ", error);
        return res.status(400).send("failed");
      } else {
        console.log("got DW response : " + response);
        const token = response.data.access_token;
        const nonce = req.query.state;
        // use nonce to retrieve user
        // Add returned token
        // redirect to success / homepage
        const user = await User.findOne({ where: { nonce: nonce } });
        const team = await Team.findOne({ where: { teamId: user.teamId } });
        const dwUserResponse = await dataworld.getActiveDWUser(token);
        const slackBot = new SlackWebClient(
          process.env.SLACK_BOT_TOKEN || team.botAccessToken
        );
        await user.update(
          { dwAccessToken: token, dwUserId: dwUserResponse.data.id },
          { fields: ["dwAccessToken", "dwUserId"] }
        );
        console.log("Added DW token : " + token);

        res.redirect(
          `https://slack.com/app_redirect?app=${
            process.env.SLACK_APP_ID
          }&team=${team.teamId}`
        );

        //inform user via slack that authentication was successful
        const slackUserId = user.slackId;
        const botResponse = await slackBot.im.open(slackUserId);
        const dmChannelId = botResponse.channel.id;
        slackBot.chat.postMessage(
          dmChannelId,
          `Well, it\'s nice to meet you, <@${slackUserId}>!. Thanks for completing authentication.`
        );
      }
    } catch (error) {
      console.error(error);
      return res.status(500).send("failed");
    }
  }
};

module.exports = { auth };
