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
const User = require("../models").User;
const Team = require("../models").Team;

const dataworld = require("../api/dataworld");
const slack = require("../api/slack");
const tokenHelper = require('../helpers/tokens')

const handleSlackAppInstallation = async (req, res) => {
  // When a user authorizes an app, a code query parameter is passed to the oAuth endpoint.
  // If that code is not there, we respond with an error message
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  if (!req.query.code) {
    return res.redirect(`${baseUrl}/failed`);
  }

  try {
    var response = await slack.oauthAccess(req.query.code);
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
      return res.redirect(
        `https://slack.com/app_redirect?app=${process.env.SLACK_APP_ID
        }&team=${team.teamId}&tab=messages`
      );

    } catch (error) {
      // error creating user
      console.error(
        "Failed complete new team creation process : " + error.message
      );
      // redirect to failure page
      return res.redirect(`${baseUrl}/failed`);
    }
  } catch (error) {
    console.error("Slack oauth failed : ", error);
    // redirect to failure page
    return res.redirect(`${baseUrl}/failed`);
  }
};

const completeDataworldAccountAssociation = async (req, res) => {
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

        // Inform user via slack that authentication was successful
        const { botToken } = await tokenHelper.getBotAccessTokenForTeam(user.teamId);
        await slack.sendCompletedAssociationMessage(botToken, user.slackId);
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
  handleSlackAppInstallation,
  completeDataworldAccountAssociation
};
