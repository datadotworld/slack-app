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
const SlackWebClient = require("@slack/client").WebClient;
const AuthMessage = require("../models").AuthMessage;
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

const sendAuthRequiredMessage = async (botAccessToken, nonce, channelId) => {
  try {
    const associationUrl = `${DW_AUTH_URL}${nonce}`;
    const commandText = process.env.SLASH_COMMAND;
    const attachments = [
      {
        color: "#355D8A",
        text: `Hi there! Linking your data.world account to Slack will make it possible to use \`/${commandText}\` commands and to show a rich preview for data.world links. You only have to do this once.\n*Would you like to set it up?*`,
        callback_id: "auth_required_message",
        actions: [
          {
            type: "button",
            text: "Connect data.world account",
            style: "primary",
            url: `${associationUrl}`
          },
          {
            name: "dismiss",
            text: "Dismiss",
            type: "button",
            value: `${nonce}`
          }
        ]
      }
    ];
    const slackBot = new SlackWebClient(botAccessToken);
    const res = await slackBot.chat.postMessage(channelId, "", {
      attachments
    });
    if (res.ok) {
      await AuthMessage.findOrCreate({
        where: { nonce: nonce },
        defaults: { channel: res.channel, ts: res.ts }
      });
    }
  } catch (error) {
    console.error("SendAuthRequiredMessage failed : ", error);
  }
};

const dismissAuthRequiredMessage = async (botAccessToken, ts, channel) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.chat.delete(ts, channel, { as_user: true });
};

const startUnfurlAssociation = async (nonce, botAccessToken, channel) => {
  const associationUrl = `${DW_AUTH_URL}${nonce}`;
  const slackBot = new SlackWebClient(botAccessToken);
  const commandText = process.env.SLASH_COMMAND;
  const attachments = [
    {
      color: "#355D8A",
      text: `Hi there! Linking your data.world account to Slack will make it possible to use \`/${commandText}\` commands and to show a rich preview for data.world links. You only have to do this once.\n*Would you like to set it up?*`,
      callback_id: "auth_required_message",
      actions: [
        {
          type: "button",
          text: "Connect data.world account",
          style: "primary",
          url: `${associationUrl}`
        },
        {
          name: "dismiss",
          text: "Dismiss",
          type: "button",
          value: `${nonce}`
        }
      ]
    }
  ];
  try {
    const res = await slackBot.chat.postMessage(channel, "", { attachments });
    if (res.ok) {
      await AuthMessage.findOrCreate({
        where: { nonce: nonce },
        defaults: { channel: res.channel, ts: res.ts }
      });
    }
  } catch (error) {
    console.error("Failed to send begin unfurl message to slack : ", error);
  }
};

const sendCompletedAssociationMessage = async (
  botAccessToken,
  slackUserId
) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.im.open(slackUserId);
  const dmChannelId = botResponse.channel.id;
  const commandText = process.env.SLASH_COMMAND;
  const attachments = [
    {
      color: "#355D8A",
      text:
        `Well, it's nice to meet you, <@${slackUserId}>! Thanks for completing authentication :tada: \n` +
        "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
        `• _/${commandText} subscribe account_ \n` +
        `• _/${commandText} subscribe dataset_url_ \n` +
        `• _/${commandText} subscribe project_url_`
    },
    {
      color: "#68BF70",
      text: `Looking for additional help? Try \`/${commandText} help\``
    }
  ];
  await slackBot.chat.postMessage(dmChannelId, "", { attachments });
};

const deleteSlackMessage = async (botAccessToken, channel, ts) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.chat.delete(ts, channel, { as_user: true });
}

const sendHowToUseMessage = async (
  botAccessToken,
  slackUserId
) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.im.open(slackUserId);
  const dmChannelId = botResponse.channel.id;
  const commandText = process.env.SLASH_COMMAND;
  const attachments = [
    {
      color: "#355D8A",
      text:
        `Hi! You can tell me what you'd like me to do using the \`/${commandText}\` command. ` +
        `You can use it here, if you would like to receive private notifications that only you and I can see. ` +
        `Alternatively, you can use it in any channel to receive notifications that are visible to all members in that channel.`
    },
    {
      color: "#68BF70",
      text: `Try \`/${commandText} help\`, if you'd like help getting started`
    }
  ];
  await slackBot.chat.postMessage(dmChannelId, "", { attachments });
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
  sendMessageWithAttachments,
  dismissAuthRequiredMessage,
  sendHowToUseMessage,
  deleteSlackMessage
};
