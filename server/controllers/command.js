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
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const User = require("../models").User;

const array = require("lodash/array");
const collection = require("lodash/collection");
const lang = require("lodash/lang");

const { auth } = require("./auth");
const { dataworld } = require("../api/dataworld");
const { helper } = require("../util/helper");
const { slack } = require("../api/slack");

// data.world command format
const dwWebhookCommandFormat = /^((\/data.world)(subscribe|unsubscribe|list|help) [\w-\/\:\.]+)$/i;
const dwSupportCommandFormat = /^((\/data.world)(list|help))$/i;

// Sub command format
const subscribeFormat = /^((\/data.world)(subscribe) (https\:\/\/data.world\/|)[\w-\/]+)$/i;
const unsubscribeFormat = /^((\/data.world)(unsubscribe) (https\:\/\/data.world\/|)[\w-\/]+)$/i;

// /data.world sub command types
const SUBSCRIBE_DATASET_OR_PROJECT = "SUBSCRIBE_DATASET_OR_PROJECT";
const SUBSCRIBE_ACCOUNT = "SUBSCRIBE_ACCOUNT";

const UNSUBSCRIBE_DATASET_OR_PROJECT = "UNSUBSCRIBE_DATASET_OR_PROJECT";
const UNSUBSCRIBE_ACCOUNT = "UNSUBSCRIBE_ACCOUNT";

// This method handles subscription to projects and datasets
const subscribeToProjectOrDataset = async (
  userid,
  channelid,
  command,
  responseUrl,
  token
) => {
  // extract params from command
  const commandParams = extractParamsFromCommand(command, false);
  try {
    // check if subscription already exist in channel
    const subscription = await Subscription.findOne({
      where: { resourceId: `${commandParams.owner}/${commandParams.id}` },
      channelId: channelid
    });
    let message = "Subscription already exists in this channel.";
    if (!subscription) {
      // subscription not found in channel
      // use dataworld wrapper to subscribe to project
      const response = await dataworld.subscribeToProject(
        commandParams.owner,
        commandParams.id,
        token
      );
      // Add subscription record to DB.
      addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
      message = response.data.message;
    }
    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message);
  } catch (error) {
    console.warn("Failed to subscribe to project : ", error.message);
    // Failed ot subscribe as project, Handle as dataset
    subscribeToDataset(userid, channelid, command, responseUrl, token);
  }
};

const subscribeToDataset = async (
  userid,
  channelid,
  command,
  responseUrl,
  token
) => {
  // use dataworld wrapper to subscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  try {
    const response = await dataworld.subscribeToDataset(
      commandParams.owner,
      commandParams.id,
      token
    );
    addSubscriptionRecord(
      commandParams.owner,
      commandParams.id,
      userid,
      channelid
    );
    // send successful subscription message to Slack
    sendSlackMessage(responseUrl, response.data.message);
  } catch (error) {
    console.warn("Failed to subscribe to dataset : ", error.message);
    sendSlackMessage(
      responseUrl,
      "Failed to subscribe to dataset : " + commandParams.id
    );
  }
};

// Subscribe to a DW account
const subscribeToAccount = async (
  userid,
  channelid,
  command,
  responseUrl,
  token
) => {
  // use dataworld wrapper to subscribe to account
  const commandParams = extractParamsFromCommand(command, true);
  try {
    const subscription = await Subscription.findOne({
      where: { resourceId: commandParams.id },
      channelId: channelid
    });
    let message = "Subscription already exists in this channel.";
    if (!subscription) {
      const response = await dataworld.subscribeToAccount(
        commandParams.id,
        token
      );
      addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
      message = response.data.message;
    }
    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message);
  } catch (error) {
    console.error("Error subscribing to account : ", error.message);
    sendSlackMessage(
      responseUrl,
      "Failed to subscribe to : " + commandParams.id
    );
  }
};

const unsubscribeFromDatasetOrProject = async (
  userId,
  channelid,
  command,
  responseUrl,
  token
) => {
  // extract params from command
  const commandParams = extractParamsFromCommand(command, false);
  const resourceId = `${commandParams.owner}/${commandParams.id}`;
  const isValid = await belongsToChannelAndUser(resourceId, channelid, userId);
  if (isValid) {
    // If subscription belongs to channel and the actor(user), then go ahead and unsubscribe
    try {
      // use dataworld wrapper to unsubscribe to dataset
      const response = await dataworld.unsubscribeFromDataset(
        commandParams.owner,
        commandParams.id,
        token
      );
      // remove subscription from DB.
      removeSubscriptionRecord(commandParams.owner, commandParams.id, userId);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.data.message, null, true);
    } catch (error) {
      console.warn("Failed to unsubscribe from dataset : ", error.message);
      // Handle as project
      unsubscribeFromProject(userId, channelid, command, responseUrl, token);
    }
  } else {
    sendSlackMessage(
      responseUrl,
      `Specified subscription \`${resourceId}\` not found in this channel.`
    );
    return;
  }
};

const unsubscribeFromProject = async (
  userId,
  channelid,
  command,
  responseUrl,
  token
) => {
  // use dataworld wrapper to unsubscribe to project
  let commandParams = extractParamsFromCommand(command, false);
  try {
    const response = await dataworld.unsubscribeFromProject(
      commandParams.owner,
      commandParams.id,
      token
    );
    removeSubscriptionRecord(commandParams.owner, commandParams.id, userId);
    // send successful unsubscription message to Slack
    sendSlackMessage(responseUrl, response.data.message);
  } catch (error) {
    console.error("Error unsubscribing from project : ", error.message);
    sendSlackMessage(
      responseUrl,
      "Failed to unsubscribe from : " + commandParams.id
    );
  }
};

const unsubscribeFromAccount = async (
  userId,
  channelid,
  command,
  responseUrl,
  token
) => {
  // use dataworld wrapper to unsubscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  let resourceId = `${commandParams.id}`;
  const isValid = await belongsToChannelAndUser(resourceId, channelid, userId);
  if (isValid) {
    try {
      const response = await dataworld.unsubscribeFromAccount(
        commandParams.id,
        token
      );
      removeSubscriptionRecord(commandParams.owner, commandParams.id, userId);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.data.message, null, true);
    } catch (error) {
      console.error("Error unsubscribing from account : ", error.message);
      sendSlackMessage(
        responseUrl,
        "Failed to unsubscribe from account : " + commandParams.id
      );
    }
  } else {
    sendSlackMessage(
      responseUrl,
      `Specified subscription \`${resourceId}\` not found in this channel.`
    );
    return;
  }
};

const belongsToChannelAndUser = async (resourceid, channelid, userId) => {
  const subscription = await Subscription.findOne({
    where: { resourceId: resourceid, channelId: channelid, slackUserId: userId }
  });
  return subscription ? true : false;
};

const listSubscription = async (req, token) => {
  let responseUrl = req.body.response_url;
  let channelid = req.body.channel_id;
  let userId = req.body.user_id;

  try {
    //Get all subscriptions in this channel
    const subscriptions = await Subscription.findAll({
      where: { channelId: channelid }
    });

    let message;
    let attachments;
    let options = [];
    let baseUrl = "https://data.world";

    if (!lang.isEmpty(subscriptions)) {
      message = `*Active Subscriptions*`;
      let attachmentText = "";

      collection.forEach(subscriptions, subscription => {
        if (subscription.slackUserId === userId) {
          options.push({
            text: subscription.resourceId,
            value: subscription.resourceId
          });
        }
        attachmentText += `• ${baseUrl}/${
          subscription.resourceId
        } \n *created by :* <@${subscription.slackUserId}> \n`;
      });

      attachments = [
        {
          color: "#79B8FB",
          text: attachmentText,
          callback_id: "unsubscribe_menu",
          actions: [
            {
              name: "subscription_list",
              text: "Unsubscribe from...",
              type: "select",
              style: "danger",
              options: options,
              confirm: {
                title: "Confirm",
                text: `Are you sure you want to unsubscribe from selected resource ?`,
                ok_text: "Yes",
                dismiss_text: "No"
              }
            }
          ]
        }
      ];
    } else {
      message = `No subscription found. Use \`\/data.world help\` to see how to subscribe.`;
    }
    sendSlackMessage(responseUrl, message, attachments);
  } catch (error) {
    console.error("Error getting subscriptions : ", error.message);
    sendSlackMessage(responseUrl, "Failed to get subscription list.");
  }
};

const addSubscriptionRecord = (owner, id, userId, channelId) => {
  // create subscription
  let resourceId = owner ? `${owner}/${id}` : `${id}`;
  Subscription.findOrCreate({
    where: { resourceId: resourceId, channelId: channelId },
    defaults: { slackUserId: userId }
  })
    .spread((subscription, created) => {
      if (!created) {
        // Subscription record already exits.
        console.warn("Subscription record already exists : ", subscription);
      }
    })
    .catch(error => {
      // error creating channel
      console.error(
        "Failed to create new Subscription record : ",
        error.message
      );
    });
};

const removeSubscriptionRecord = (owner, id, userId) => {
  // delete subscription
  let resourceId = owner ? `${owner}/${id}` : `${id}`;
  Subscription.destroy({
    where: { resourceId: resourceId, slackUserId: userId }
  }).catch(error => {
    // error deleting Subscription
    console.error("Failed to create new Subscription record : ", error.message);
  });
};

const extractParamsFromCommand = (command, isAccountCommand) => {
  let params = {};
  let parts = command.split(" ");
  let datasetInfo = parts[parts.length - 1];
  let data = datasetInfo.split("/");

  params.owner = isAccountCommand ? null : data[data.length - 2];
  params.id = data[data.length - 1];

  return params;
};

const sendSlackMessage = (
  responseUrl,
  message,
  attachments,
  replaceOriginal
) => {
  try {
    let data = { text: message };
    if (attachments && !lang.isEmpty(attachments)) {
      data.attachments = attachments;
    }
    data.replace_original = replaceOriginal ? replaceOriginal : false;
    slack.sendResponse(responseUrl, data);
  } catch (error) {
    console.error("Failed to send message to slack", error.message);
  }
};

const sendSlackAttachment = (responseUrl, attachment) => {
  try {
    slack.sendResponse(responseUrl, attachment).catch(console.error);
  } catch (error) {
    console.error("Failed to send attachment to slack", error.message);
  }
};

const sendSlackAttachments = (responseUrl, attachments) => {
  try {
    let data = {};
    data.attachments = attachments;
    slack.sendResponse(responseUrl, data).catch(console.error);
  } catch (error) {
    console.error("Failed to send attachments to slack", error.message);
  }
};

const getType = (command, option) => {
  // determine type of command
  if (subscribeFormat.test(command)) {
    return option.indexOf("/") > 0
      ? SUBSCRIBE_DATASET_OR_PROJECT
      : SUBSCRIBE_ACCOUNT;
  } else if (unsubscribeFormat.test(command)) {
    return option.indexOf("/") > 0
      ? UNSUBSCRIBE_DATASET_OR_PROJECT
      : UNSUBSCRIBE_ACCOUNT;
  }
  console.error("Unknown command type : ", command);
  return;
};

const subscribeOrUnsubscribe = (req, token) => {
  //Invalid / Unrecognized command is not expected to make it here.
  let command = req.body.command + helper.cleanSlackLinkInput(req.body.text);
  let commandType = getType(command, helper.cleanSlackLinkInput(req.body.text));
  let responseUrl = req.body.response_url;

  switch (commandType) {
    case SUBSCRIBE_DATASET_OR_PROJECT:
      subscribeToProjectOrDataset(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token
      );
      break;
    case SUBSCRIBE_ACCOUNT:
      subscribeToAccount(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token
      );
      break;
    case UNSUBSCRIBE_DATASET_OR_PROJECT:
      unsubscribeFromDatasetOrProject(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token
      );
      break;
    case UNSUBSCRIBE_ACCOUNT:
      unsubscribeFromAccount(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token
      );
      break;
    default:
      console.error("Attempt to process unknown command.", command);
      break;
  }
};

const showHelp = responseUrl => {
  let message = `*Commands*`;
  let attachments = [];

  let commandsInfo = [
    "_Subscribe to a data.world dataset :_ \n `/data.world subscribe [owner/datasetid]`",
    "_Subscribe to a data.world project._ : \n `/data.world subscribe [owner/projectid]`",
    "_Subscribe to a data.world account._ : \n `/data.world subscribe [account]`",
    "_Unsubscribe from a data.world dataset._ : \n `/data.world unsubscribe [owner/datasetid]`",
    "_Unsubscribe from a data.world project._ : \n `/data.world unsubscribe [owner/projectid]`",
    "_Unsubscribe from a data.world account._ : \n `/data.world unsubscribe [account]`",
    "_List active subscriptions._ : \n `/data.world list`",
    "_Show this help message_ : \n `/data.world help`"
  ];

  collection.forEach(commandsInfo, value => {
    attachments.push({
      color: "#79B8FB",
      text: value
    });
  });

  sendSlackMessage(responseUrl, message, attachments);
};

const handleButtonAction = (payload, action, user) => {
  if (payload.callback_id === "dataset_subscribe_button") {
    subscribeToProjectOrDataset(
      payload.user.id,
      payload.channel.id,
      `subscribe ${action.value}`,
      payload.response_url,
      user.dwAccessToken
    );
    if (payload.original_message) {
      collection.forEach(payload.original_message.attachments, attachment => {
        // remove subscribe button
        array.remove(attachment.actions, action => {
          return action.name === "subscribe";
        });
        if (payload.is_app_unfurl) {
          // update unfurl attachment
          sendSlackAttachment(payload.response_url, attachment);
        } else {
          // update message attachments
          sendSlackAttachments(payload.response_url, [attachment]);
        }
      });
    }
  } else {
    // unknow action
    console.warn("Unknown callback_id in button action event.");
    return;
  }
};

const handleMenuAction = (payload, action, user) => {
  if (payload.callback_id === "unsubscribe_menu") {
    const value = action.selected_options[0].value;
    if (value.indexOf("/") > -1) {
      //unsubscribe from project of dataset
      unsubscribeFromDatasetOrProject(
        payload.user.id,
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
        user.dwAccessToken
      );
    } else if (value.indexOf("/") === -1) {
      // unsubscribe from account
      unsubscribeFromAccount(
        payload.user.id,
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
        user.dwAccessToken
      );
    } else {
      // unrecognized value
      console.warn("Unknown resourceId in menu action event.", value);
      return;
    }
  } else {
    // unknow action
    console.warn("Unknown callback_id in menu action event.");
    return;
  }
};

const command = {
  async performAction(req, res) {
    res.status(200).send();
    const payload = JSON.parse(req.body.payload); // parse URL-encoded payload JSON string
    try {
      const channel = await Channel.findOne({
        where: { channelId: payload.channel.id }
      });
      if (channel) {
        const [isAssociated, user] = await auth.checkSlackAssociationStatus(
          payload.user.id
        );
        let message;
        if (isAssociated) {
          // subscribe or unsubscribe to/from resource.
          collection.forEach(payload.actions, action => {
            switch (action.type) {
              case "button":
                handleButtonAction(payload, action, user);
                break;
              case "select":
                handleMenuAction(payload, action, user);
                break;
              default:
                console.warn("Unknown action type : ", action.type);
                break;
            }
          });
        } else {
          // User is not associated begin association process.
          message = `Sorry <@${
            payload.user.id
          }>, authentication is required for this action. I can help you, just check my DM for the next step, and then you can try the command again.`;
          auth.beginSlackAssociation(
            payload.user.id,
            payload.user.name,
            payload.team.id
          );
        }
        if (message) {
          sendSlackMessage(payload.response_url, message);
        }
      } else {
        // inform user that bot user must be invited to channel
        message = `Sorry <@${
          payload.user.id
        }>, you can't perform this action until you've invited <@dataworld> to this channel.`;
        sendSlackMessage(payload.response_url, message);
        return;
      }
    } catch (error) {
      // An internal error has occured send a descriptive message
      console.error("Failed to perform action : ", error.message);
      message = `Sorry <@${
        payload.user.id
      }>, we're unable to perform this action at the moment right now. Kindly, try again later.`;
      sendSlackMessage(payload.response_url, message);
    }
  },

  async validate(req, res, next) {
    // respond to request immediately no need to wait.
    res.json({
      response_type: "ephemeral",
      text: `\`${req.body.command} ${req.body.text}\``
    });
    try {
      const channel = await Channel.findOne({
        where: { channelId: req.body.channel_id }
      });
      if (channel) {
        // Check if bot was invited to slack
        // channel found, continue and process command
        // Authenticate the Slack user
        // An assumption is being made: all commands require authentication
        // check association status
        const [isAssociated, user] = await auth.checkSlackAssociationStatus(
          req.body.user_id
        );
        let message;
        if (isAssociated) {
          // User is associated, carry on and validate command
          let option = req.body.text;
          if (
            dwWebhookCommandFormat.test(
              req.body.command + helper.cleanSlackLinkInput(option)
            )
          ) {
            // Process command
            subscribeOrUnsubscribe(req, user.dwAccessToken);
          } else if (dwSupportCommandFormat.test(req.body.command + option)) {
            option === "list"
              ? listSubscription(req, user.dwAccessToken)
              : showHelp(req.body.response_url);
          } else {
            message = `Cannot understand the command: \`${req.body.command} ${
              req.body.text
            }\` . Please, Ensure command options and specified id are valid.`;
          }
        } else {
          // User is not associated begin association process.
          message = `Sorry <@${req.body.user_id}>, you can't run \`${
            req.body.command
          }\` until after you authenticate. I can help you, just check my DM for the next step, and then you can try the command again.`;
          auth.beginSlackAssociation(
            req.body.user_id,
            req.body.user_name,
            req.body.team_id
          );
        }

        if (message) {
          sendSlackMessage(req.body.response_url, message);
        }
      } else {
        // inform user that bot user must be invited to channel
        message = `Sorry <@${req.body.user_id}>, you can't run \`${
          req.body.command
        }\` until you've invited <@dataworld> to this channel.`;
        sendSlackMessage(req.body.response_url, message);
        return;
      }
    } catch (error) {
      // An internal error has occured send a descriptive message
      console.error("Failed to process command : ", error.message);
      message = `Sorry <@${
        req.body.user_id
      }>, we're unable to process command \`${
        req.body.command
      }\` right now. Kindly, try again later.`;
      sendSlackMessage(req.body.response_url, message);
    }
  }
};

module.exports = { command };
