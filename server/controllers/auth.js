/*
 * data.world Slack Application
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
const crypto = require('crypto');
const qs = require('qs');

const Subscription = require("../models").Subscription;
const User = require("../models").User;
const Team = require("../models").Team;

const uuidv1 = require("uuid/v1");
const Sequelize = require("sequelize");

const dataworld = require("../api/dataworld");
const slack = require("../api/slack");

const Op = Sequelize.Op;

const slackOauth = (req, res) => {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint.
  // If that code is not there, we respond with an error message
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  if (!req.query.code) {
    return res.redirect(`${baseUrl}/failed`);
  }
  // If it's there...
  // call slack api
  slack
    .oauthAccess(req.query.code)
    .then(async response => {
      // create team with returned data
      const [team, created] = await Team.findOrCreate({
        where: { teamId: response.data.team.id },
        defaults: {
          teamDomain: response.data.team.name,
          accessToken: response.data.authed_user.access_token,
          botUserId: response.data.bot_user_id,
          botAccessToken: response.data.access_token
        }
      });
      try {
        if (!created) {
          // Team record already exits.
          // Update existing record with new data
          await team.update(
            {
              teamDomain: response.data.team.name,
              accessToken: response.data.authed_user.access_token,
              botUserId: response.data.bot_user_id,
              botAccessToken: response.data.access_token
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
        //inform user via slack that installation was successful
        const botToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
        await slack.sendWelcomeMessage(botToken, response.data.authed_user.id);

        // deep link to slack app or redirect to slack team in web.
        res.redirect(
          `https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID
          }&team=${team.teamId}`
        );
      } catch (error) {
        // error creating user
        console.error(
          "Failed complete new team creation process : " + error.message
        );
        // redirect to failure page
        res.redirect(`${baseUrl}/failed`);
      }
    })
    .catch(error => {
      console.error("Slack oauth failed : ", error);
      // redirect to failure page
      res.redirect(`${baseUrl}/failed`);
    });
};

const verifySlackRequest = async (headers, body) => {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const slackTimestamp = headers["x-slack-request-timestamp"];
  const slackSignature = headers["x-slack-signature"];

  if (!(slackSigningSecret && slackTimestamp && slackSignature)) return false;

  // It could be a replay attack, if the request timestamp is more than five minutes from local time.
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(slackTimestamp, 10) > 60 * 5) return false;

  // Validate the slack signature by comparing with computed signature
  const signatureBaseString = "v0:" + slackTimestamp + ":" + body;
  const mySignature = "v0=" + crypto.createHmac("sha256", slackSigningSecret).update(signatureBaseString, 'utf8').digest("hex");
  return crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'));
};

const verifySlackClient = (req, res, next) => {
  if (verifySlackRequest(req.headers, req.rawBody)) {
    if (req.body.challenge) {
      // Respond to slack challenge.
      return res.status(200).send({ challenge: req.body.challenge });
    }
    if (req.body.ssl_check) {
      return res.status(200).send();
    }
    next();
  } else {
    next(new Error("Could not verify the request originated from Slack."));
  }
};

const checkSlackAssociationStatus = async slackId => {
  try {
    let user = await User.findOne({
      where: { slackId: slackId, dwAccessToken: { [Op.ne]: null } }
    });
    let isAssociated = false;
    if (user) {
      // Check user association
      // User found, now verify DW token is active/valid.
      isAssociated = await dataworld.verifyDwToken(user.dwAccessToken);
      if (!isAssociated) {
        // Attempt to refresh token
        const response = await dataworld.refreshToken(user.dwRefreshToken);
        if (response) {
          user = await user.update(
            { dwAccessToken: response.data.access_token, dwRefreshToken: response.data.refresh_token },
            { fields: ["dwAccessToken", "dwRefreshToken"] }
          );
          isAssociated = true;
        } else {
          // Access was revoked, this means all DW subscriptions for this user were removed
          // We should do the same
          await Subscription.destroy({
            where: { slackUserId: slackId }
          });
        }
      }
    }
    return [isAssociated, user];
  } catch (error) {
    console.error("Error verifying slack association status : ", error.message);
    throw error;
  }
};

const beginSlackAssociation = async (slackUserId, teamId, channelId) => {
  try {
    let nonce = uuidv1();
    const team = await Team.findOne({ where: { teamId: teamId } });
    const botToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;

    // create user with nonce and the slackdata
    const [user, created] = await User.findOrCreate({
      where: { slackId: slackUserId },
      defaults: { teamId: teamId, nonce: nonce }
    });

    // Inform user that authentication is required
    await slack.sendAuthRequiredMessage(
      botToken,
      user.nonce,
      channelId,
      slackUserId
    );
  } catch (error) {
    console.error("Begin slack association error : ", error.message);
  }
};

// TODO: This can be merged with beginSlackAssociation and replaced across project.
const beginUnfurlSlackAssociation = async (
  userId,
  channel,
  teamId,
  messageTs
) => {
  try {
    const nonce = uuidv1();
    const team = await Team.findOne({ where: { teamId: teamId } });
    const botAccessToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
    const teamAccessToken = process.env.SLACK_TEAM_TOKEN || team.accessToken;
    // create user with nonce and the slackdata
    const [user, created] = await User.findOrCreate({
      where: { slackId: userId },
      defaults: { teamId: teamId, nonce: nonce }
    });

    await slack.startUnfurlAssociation(
      user.nonce,
      botAccessToken,
      channel,
      userId,
      messageTs,
      teamAccessToken
    );
  } catch (error) {
    console.error("Begin unfurl slack association error : ", error);
  }
};

const completeSlackAssociation = async (req, res) => {
  try {
    const response = await dataworld.exchangeAuthCode(req.query.code);
    if (response.error) {
      return res.status(400).send("failed");
    } else {
      const token = response.data.access_token;
      const refreshToken = response.data.refresh_token;
      const nonce = req.query.state;
      // use nonce to retrieve user
      // Add returned token
      // redirect to success / homepage
      const user = await User.findOne({ where: { nonce: nonce } });
      if (user) {
        const dwUserResponse = await dataworld.getActiveDWUser(token);
        await user.update(
          {
            dwAccessToken: token,
            dwRefreshToken: refreshToken,
            dwUserId: dwUserResponse.data.id
          },
          { fields: ["dwAccessToken", "dwRefreshToken", "dwUserId"] }
        );

        res.status(200).json({
          url: `https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID
            }&team=${user.teamId}`
        });

        //inform user via slack that authentication was successful
        const team = await Team.findOne({ where: { teamId: user.teamId } });
        const botAccessToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
        await slack.sendCompletedAssociationMessage(botAccessToken, user.slackId);
      } else {
        console.warn("Received an invalid nonce, we should ensure stale auth links are cleaned up properly.");
        return res.status(400).send("Provided nonce is invalid.");
      }
    }
  } catch (error) {
    //console.error(error);
    return res.status(500).send("Slack association failed.");
  }
};

module.exports = {
  slackOauth,
  verifySlackClient,
  verifySlackRequest,
  checkSlackAssociationStatus,
  beginSlackAssociation,
  beginUnfurlSlackAssociation,
  completeSlackAssociation
};
