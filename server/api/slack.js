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
const SlackWebClient = require("@slack/web-api").WebClient;
const lang = require('lodash/lang')

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

const isPrivateChannel = channelId => {
  return channelId.startsWith("G");
};

// TODO: Handle channel list response pagination when checking bot presence in channels
// https://api.slack.com/methods/channels.list
// https://api.slack.com/docs/pagination#classic
const botBelongsToChannel = async (channelId, botAccessToken) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const type = getChannelType(channelId);
  switch (type) {
    case DM_CHANNEL:
      const imsRes = await slackBot.conversations.list({ types: 'im' });
      return imsRes.channels.some(channel => channel.id === channelId);
    case PUBLIC_CHANNEL:
      // TODO: Why was this changed to return both public and private channels ? Does that mean both private and public now have the same prefix
      // We used to just have conversations.list() here, which returns only public channels by default
      const channelsRes = await slackBot.conversations.list({ types: 'public_channel,private_channel' });
      return channelsRes.channels.some(
        channel => channel.id === channelId && channel.is_member
      );
    case GROUP_CHANNEL:
      const groupsRes = await slackBot.conversations.list({ types: 'private_channel' });
      return groupsRes.channels.some(channel => channel.id === channelId);
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

  return axios.get("https://slack.com/api/oauth.v2.access", {
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
    const botResponse = await slackBot.conversations.open({ users: slackUserId });
    if (botResponse && botResponse.channel) {
      const dmChannelId = botResponse.channel.id;
      const commandText = process.env.SLASH_COMMAND;
      const blocks = [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "You've successfully installed data.world on this Slack workspace :tada: \n" +
            "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
            `• _/${commandText} subscribe account_ \n` +
            `• _/${commandText} subscribe dataset_url_ \n` +
            `• _/${commandText} subscribe project_url_`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Looking for additional help? Try \`/${commandText} help\``
        }
      }]

      slackBot.chat.postMessage({ channel: dmChannelId, text: "You've successfully installed data.world on this Slack workspace", blocks: blocks });
    } else {
      console.warn("Unable to start Bot DM chat with user.");
    }
  } catch (error) {
    console.error("SendWelcomeMessage failed : ", error);
  }
};

const getAppDmChannel = async (botAccessToken, slackUserId) => {
  // Needed for cases where we need to send user a message but due to actions taken from a non-channel context, e.g action taken on app home tab
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.conversations.open({ users: slackUserId });
  if (botResponse && botResponse.channel) {
    return botResponse.channel.id;
  }
} 

const sendAuthRequiredMessage = async (botAccessToken, nonce, channelId, slackUserId) => {
  try {
    const associationUrl = `${DW_AUTH_URL}${nonce}`;
    const commandText = process.env.SLASH_COMMAND;
    const slackBot = new SlackWebClient(botAccessToken);
    const blocks = [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Hi there! Linking your data.world account to Slack will make it possible to use \`/${commandText}\` commands and to show a rich preview for data.world links. You only have to do this once.\n*Would you like to set it up?*`
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "style": "primary",
          "text": {
            "type": "plain_text",
            "text": "Connect data.world account",
          },
          "url": `${associationUrl}`
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Dismiss"
          },
          "value": `${nonce}`
        }
      ]
    }]

    await slackBot.chat.postEphemeral({
      channel: channelId, user: slackUserId, blocks: blocks, text: "Linking your data.world account",
    });
  } catch (error) {
    console.error("SendAuthRequiredMessage failed : ", error);
  }
};

const dismissAuthRequiredMessage = async (responseUrl) => {
  let data = { text: "", replace_original: true, delete_original: true };
  try {
    await sendResponse(responseUrl, data);
  } catch (error) {
    console.error("Failed to dismiss account binding message.", error.message);
  }
};

const startUnfurlAssociation = async (nonce, botAccessToken, channel, slackUserId, messageTs, teamAccessToken) => {
  try {
    const associationUrl = `${DW_AUTH_URL}${nonce}`;
    const slackBot = new SlackWebClient(botAccessToken);
    const commandText = process.env.SLASH_COMMAND;
    const belongsToChannel = await botBelongsToChannel(channel, botAccessToken);
    if (!belongsToChannel) {
      // Fallback to slack default style of requesting auth for unfurl action.
      await chatUnfurl({ ts: messageTs, channel: channel, user_auth_required: true, user_auth_url: associationUrl }, botAccessToken, teamAccessToken);
    } else {
      const blocks = [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hi there! Linking your data.world account to Slack will make it possible to use \`/${commandText}\` commands and to show a rich preview for data.world links. You only have to do this once.\n*Would you like to set it up?*`
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "style": "primary",
            "text": {
              "type": "plain_text",
              "text": "Connect data.world account",
            },
            "url": `${associationUrl}`
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Dismiss"
            },
            "value": `${nonce}`
          }
        ]
      }]
      await slackBot.chat.postEphemeral({ channel: channel, user: slackUserId, text: "Link your data.world account to Slack", blocks: blocks });
    }
  } catch (error) {
    console.error(`Failed to send begin unfurl message to slack : ${channel}`, error);
  }
};

const sendCompletedAssociationMessage = async (botAccessToken, slackUserId) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.conversations.open({ users: slackUserId });
  const dmChannelId = botResponse.channel.id;
  const commandText = process.env.SLASH_COMMAND;

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Well, it's nice to meet you, <@${slackUserId}>! Thanks for completing authentication :tada: \n` +
          "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
          `• _/${commandText} subscribe account_ \n` +
          `• _/${commandText} subscribe dataset_url_ \n` +
          `• _/${commandText} subscribe project_url_`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Looking for additional help? Try \`/${commandText} help\``
      }
    }
  ];

  await slackBot.chat.postMessage({ channel: dmChannelId, text: "Thanks for completing authentication", blocks: blocks /*attachments : { attachments }*/ });
};

const deleteSlackMessage = async (botAccessToken, channel, ts) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.chat.delete(ts, channel, { as_user: true });
};

const sendHowToUseMessage = async (botAccessToken, slackUserId) => {
  const slackBot = new SlackWebClient(botAccessToken);
  const botResponse = await slackBot.conversations.open({ users: slackUserId });
  const dmChannelId = botResponse.channel.id;
  const commandText = process.env.SLASH_COMMAND;
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Hi! You can tell me what you'd like me to do using the \`/${commandText}\` command. ` +
          `You can use it here, if you would like to receive private notifications that only you and I can see. ` +
          `Alternatively, you can use it in any channel to receive notifications that are visible to all members in that channel.`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Try \`/${commandText} help\`, if you'd like help getting started`
      }
    }

  ];

  await slackBot.chat.postMessage({ channel: dmChannelId, text: "howto", blocks: blocks/*attachments : { attachments }*/ });
};

const sendUnfurlAttachments = async (ts, channel, unfurls, botAccessToken, teamAccessToken) => {
  await chatUnfurl({ ts: ts, channel: channel, unfurls: unfurls }, botAccessToken, teamAccessToken);
};

const sendMessageWithAttachments = (botAccessToken, channelId, attachments) => {
  const slackBot = new SlackWebClient(botAccessToken);
  slackBot.chat.postMessage({ channel: channelId, attachments: attachments });
};

const publishAppHomeView = async (botAccessToken, slackUserId, blocks) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.views.publish({ user_id: slackUserId, view: { type: 'home', blocks, callback_id: 'publish_app_home_view' }});
}

const postMessageWithBlocks = async (botAccessToken, channelId, blocks) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.chat.postMessage({
    channel: channelId,
    text: "",
    blocks: blocks
  });
}

const openView = async (botAccessToken, triggerId, view) => {
  const slackBot = new SlackWebClient(botAccessToken);
  await slackBot.views.open({ trigger_id: triggerId, view });
}

const sendResponseMessageAndBlocks = async (
  responseUrl,
  message,
  blocks,
  replaceOriginal,
  deleteOriginal,
) => {
  let data = {}
  if (message && message.length > 0) {
    data.text = message;
  }
  if (blocks && !lang.isEmpty(blocks)) {
    data.blocks = blocks
  }
  data.replace_original = replaceOriginal ? replaceOriginal : false
  data.delete_original = deleteOriginal ? deleteOriginal : false
  try {
    await sendResponse(responseUrl, data)
  } catch (error) {
    console.error('Failed to send message to slack', error);
  }
}

async function chatUnfurl(opts, botAccessToken, teamAccessToken) {
  try {
    console.error("Using bot token for unfurl.... ");
    await new SlackWebClient(botAccessToken).chat.unfurl(opts);
  } catch (error) {
    console.error("Chat.unfurl call failed with bot token", error.data.error);
    if (error.data && error.data.error === 'not_allowed_token_type') {
      console.log("Retrying with team token", error);
      await new SlackWebClient(teamAccessToken).chat.unfurl(opts);
    }
  }
}

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
  postMessageWithBlocks,
  dismissAuthRequiredMessage,
  sendHowToUseMessage,
  deleteSlackMessage,
  openView,
  publishAppHomeView,
  getAppDmChannel,
  sendResponseMessageAndBlocks,
};