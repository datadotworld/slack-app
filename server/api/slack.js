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
const axios = require("axios");
const collection = require("lodash/collection");
const SlackWebClient = require("@slack/client").WebClient;
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};
const DW_AUTH_URL = require("../helpers/helper").DW_AUTH_URL;
const DM_CHANNEL = "DM_CHANNEL";
const GROUP_CHANNEL = "GROUP_CHANNEL";
const PUBLIC_CHANNEL = "PUBLIC_CHANNEL"; // public or private channels.

const getChannelType = channelId => {
  // determine type of channel
  if (channelId.startsWith("D")) {
    return DM_CHANNEL;
  } else if (channelId.startsWith("G")) {
    return GROUP_CHANNEL;
  } else if (channelId.startsWith("C")) {
    return PUBLIC_CHANNEL;
  }
  console.error("Unknown channel type : ", channelId);
  return;
};

const isDMChannel = channelId => {
  return channelId.startsWith("D");
};

// TODO: Handle channel list response pagination when checking bot presence in channels
// https://api.slack.com/methods/channels.list
// https://api.slack.com/docs/pagination#classic
const botBelongsToChannel = async (channelId, botAccessToken) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const type = getChannelType(channelId);
  switch (type) {
    case DM_CHANNEL:
      const imsRes = await slackBot.im.list();
      return imsRes.ims.some(channel => channel.id === channelId);
    case PUBLIC_CHANNEL:
      const channelsRes = await slackBot.channels.list();
      return channelsRes.channels.some(
        channel => channel.id === channelId && channel.is_member
      );
    case GROUP_CHANNEL:
      const groupsRes = await slackBot.groups.list();
      return groupsRes.groups.some(channel => channel.id === channelId);
    default:
      console.error("Unknown channel type.");
      return;
  }
};

const oauthAccess = code => {
  const params = {
    code: code,
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET
  };

  return axios.get("https://slack.com/api/oauth.access", {
    headers,
    params
  });
};

const sendResponse = (responseUrl, data) => {
  return axios.post(responseUrl, data, { headers });
};

const sendWelcomeMessage = async (botAccessToken, slackUserId) => {
  try {
    const slackBot = new SlackWebClient(botAccessToken);
    const botResponse = await slackBot.im.open(slackUserId);
    if (botResponse && botResponse.channel) {
      const dmChannelId = botResponse.channel.id;
      const commandText = process.env.SLASH_COMMAND;
      slackBot.chat.postMessage(dmChannelId, "", {
        attachments: [
          {
            color: "#355D8A",
            text:
              "You've successfully installed data.world on this Slack workspace :tada: \n" +
              "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
              `• _/${commandText} subscribe account_ \n` +
              `• _/${commandText} subscribe dataset_url_ \n` +
              `• _/${commandText} subscribe project_url_`
          },
          {
            color: "#68BF70",
            text: `Looking for additional help? Try \`/${commandText} help\``
          }
        ]
      });
    } else {
      console.warn("Unable to start Bot DM chat with user.");
    }
  } catch (error) {
    console.error("SendWelcomeMessage failed : ", error);
  }
};

const sendAuthRequiredMessage = async (
  botAccessToken,
  slackUserId,
  nonce,
  slackUsername
) => {
  try {
    const slackBot = new SlackWebClient(botAccessToken);
    const res = await slackBot.im.open(slackUserId);
    if (res && res.channel) {
      const dmChannelId = res.channel.id;
      const associationUrl = `${DW_AUTH_URL}${nonce}`;
      slackBot.chat.postMessage(
        dmChannelId,
        `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you stay up-to-date with data.world.`,
        {
          attachments: [
            {
              text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`
            }
          ]
        }
      );
    } else {
      console.warn("Unable to start Bot DM chat with user.");
    }
  } catch (error) {
    console.error("SendAuthRequiredMessage failed : ", error);
  }
};

const startUnfurlAssociation = (
  associationUrl,
  teamAccessToken,
  messageTs,
  channel
) => {
  const opts = {};
  const unfurls = {};
  opts.user_auth_required = true;
  opts.user_auth_url = associationUrl;
  const slackWebApi = new SlackWebClient(teamAccessToken);
  slackWebApi.chat
    .unfurl(messageTs, channel, unfurls, opts) // With opts, this will prompt user to authenticate using the association Url above.
    .catch(error => {
      console.error("Failed to send begin unfurl message to slack : ", error);
    });
};

const sendCompletedAssociationMessage = async (botAccessToken, slackUserId) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.im.open(slackUserId);
  const dmChannelId = botResponse.channel.id;
  slackBot.chat.postMessage(
    dmChannelId,
    `Well, it\'s nice to meet you, <@${slackUserId}>! Thanks for completing authentication.`
  );
};

const sendUnfurlAttachments = (ts, channel, unfurls, teamAccessToken) => {
  const slackTeam = new SlackWebClient(teamAccessToken);
  slackTeam.chat.unfurl(ts, channel, unfurls);
};

const sendMessageWithAttachments = (botAccessToken, channelId, attachments) => {
  const slackBot = new SlackWebClient(botAccessToken);
  slackBot.chat.postMessage(channelId, "", { attachments });
};

module.exports = {
  botBelongsToChannel,
  isDMChannel,
  oauthAccess,
  sendResponse,
  sendWelcomeMessage,
  sendAuthRequiredMessage,
  startUnfurlAssociation,
  sendCompletedAssociationMessage,
  sendUnfurlAttachments,
  sendMessageWithAttachments
};
