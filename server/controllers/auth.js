/*
 * Data.World Slack Application
 * Copyright 2018 data.world, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This product includes software developed at
 * data.world, Inc. (http://data.world/).
 */
const User = require("../models").User;
const Team = require("../models").Team;

const SlackWebClient = require("@slack/client").WebClient;
const uuidv1 = require("uuid/v1");
const Sequelize = require("sequelize");

const { dataworld } = require("../api/dataworld");
const { slack } = require("../api/slack");

const Op = Sequelize.Op;
const authUrl = `${process.env.DW_AUTH_BASE_URL}?client_id=${
  process.env.DW_CLIENT_ID
}&redirect_uri=${process.env.DW_REDIRECT_URI}&state=`;
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
      return res.status(500).send({
        Error: "Looks like we're not getting the expected code query parameter."
      });
    }
    // If it's there...
    // call slack api
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    slack
      .oauthAccess(req.query.code)
      .then(response => {
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
        console.error("Slack oauth failed : ", error.message);
        // redirect to failure page
        res.redirect(`${baseUrl}failed`);
      });
  },

  verifySlackClient(req, res, next) {
    if (req.body.challenge) {
      // Respond to slack challenge.
      return res.status(200).send({ challenge: req.body.challenge });
    }
    if (req.body.token === slackVerificationToken) {
      if (req.body.ssl_check) {
        return res.status(200).send();
      }
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
        // User found, now verify DW token is active/valid.
        isAssociated = await dataworld.verifyDwToken(user.dwAccessToken);
      }
      return [isAssociated, user];
    } catch (error) {
      console.error(
        "Error verifying slack association status : ",
        error.message
      );
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
      console.error("Begin slack association error : ", error.message);
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
        const token = response.data.access_token;
        console.log("State is : " + req.query.state);
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
        res.status(200).json({
          url: `https://slack.com/app_redirect?app=${
            process.env.SLACK_APP_ID
          }&team=${user.teamId}`
        });
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
      return res.status(500).send("Slack association failed.");
    }
  }
};

module.exports = { auth };
