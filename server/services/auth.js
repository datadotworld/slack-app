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

const Subscription = require("../models").Subscription;
const User = require("../models").User;
const Team = require("../models").Team;

const uuidv1 = require("uuid/v1");
const Sequelize = require("sequelize");

const dataworld = require("../api/dataworld");
const slack = require("../api/slack");

const Op = Sequelize.Op;

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

module.exports = {
  checkSlackAssociationStatus,
  beginSlackAssociation,
  beginUnfurlSlackAssociation,
};
