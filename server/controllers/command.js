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
const Team = require("../models").Team;
const Subscription = require("../models").Subscription;

const array = require("lodash/array");
const collection = require("lodash/collection");
const lang = require("lodash/lang");

const auth = require("./auth");
const dataworld = require("../api/dataworld");
const helper = require("../helpers/helper");
const slack = require("../api/slack");

// data.world command format
const commandText = process.env.SLASH_COMMAND;
const dwCommandRegex = new RegExp(
  `^((\\\/${commandText})(subscribe|unsubscribe) [\\w-\\\/\\:\\.]+)$`,
  "i"
);
const dwSupportCommandRegex = new RegExp(
  `^((\\\/${commandText})(list|help))$`,
  "i"
);

// Sub command format
const subscribeFormat = new RegExp(
  `^((\\\/${commandText})(subscribe) (https\\:\\\/\\\/data.world\\\/|)[\\w-\\\/]+)$`,
  "i"
);
const unsubscribeFormat = new RegExp(
  `^((\\\/${commandText})(unsubscribe) (https\\:\\\/\\\/data.world\\\/|)[\\w-\\\/]+)$`,
  "i"
);

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
  const commandParams = helper.extractParamsFromCommand(command, false);
  try {
    // check if subscription already exist in channel
    const channelSubscription = await Subscription.findOne({
      where: {
        resourceId: `${commandParams.owner}/${commandParams.id}`,
        channelId: channelid
      }
    });
    let message = "Subscription already exists in this channel.";
    if (!channelSubscription) {
      // subscription not found in channel

      // check if same user has an existing DW subscription for this resource
      const existingDwSubscription = await Subscription.findOne({
        where: {
          resourceId: `${commandParams.owner}/${commandParams.id}`,
          slackUserId: userid
        }
      });
      // use dataworld wrapper to subscribe to project
      if (!existingDwSubscription) {
        await dataworld.subscribeToProject(
          commandParams.owner,
          commandParams.id,
          token
        );
      }
      // Add subscription record to DB.
      await addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
      message = "Webhook subscription created successfully.";
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
  let commandParams = helper.extractParamsFromCommand(command, false);
  try {
    // check if same user has an existing DW subscription for this resource
    const existingDwSubscription = await Subscription.findOne({
      where: {
        resourceId: `${commandParams.owner}/${commandParams.id}`,
        slackUserId: userid
      }
    });
    let message = "";
    if (!existingDwSubscription) {
      const response = await dataworld.subscribeToDataset(
        commandParams.owner,
        commandParams.id,
        token
      );
      message = response.data.message;
    }
    addSubscriptionRecord(
      commandParams.owner,
      commandParams.id,
      userid,
      channelid
    );
    // send successful subscription message to Slack
    message = message || "Webhook subscription created successfully.";
    sendSlackMessage(responseUrl, message);
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
  const commandParams = helper.extractParamsFromCommand(command, true);
  try {
    const subscription = await Subscription.findOne({
      where: { resourceId: commandParams.id, channelId: channelid }
    });
    let message = "Subscription already exists in this channel.";
    if (!subscription) {
      const existingDwSubscription = await Subscription.findOne({
        where: {
          resourceId: `${commandParams.owner}/${commandParams.id}`,
          slackUserId: userid
        }
      });
      if (!existingDwSubscription) {
        await dataworld.subscribeToAccount(
          commandParams.id,
          token
        );
      }
      addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
      message = "Webhook subscription created successfully.";
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
  try {
    // extract params from command
    const commandParams = helper.extractParamsFromCommand(command, false);
    const resourceId = `${commandParams.owner}/${commandParams.id}`;
    const [
      hasSubscriptionInChannel,
      removeDWSubscription
    ] = await helper.getSubscriptionStatus(resourceId, channelid, userId);

    // If subscription belongs to channel and the actor(user), then go ahead and unsubscribe
    if (hasSubscriptionInChannel) {
      // will be true if user subscribed to this resource in one channel
      if (removeDWSubscription) {
        // use dataworld wrapper to unsubscribe from dataset
        await dataworld.unsubscribeFromDataset(
          commandParams.owner,
          commandParams.id,
          token
        );
      }

      // remove subscription from DB.
      await removeSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userId,
        channelid
      );
      // send successful unsubscription message to Slack
      const message = "Webhook subscription deleted successfully.";
      await sendSlackMessage(responseUrl, message);
    } else {
      await sendSlackMessage(
        responseUrl,
        `Specified subscription \`${resourceId}\` not found in this channel.`
      );
      return;
    }
  } catch (error) {
    console.warn("Failed to unsubscribe from dataset : ", error.message);
    // Handle as project
    await unsubscribeFromProject(
      userId,
      channelid,
      command,
      responseUrl,
      token
    );
  }
};

const unsubscribeFromProject = async (
  userId,
  channelId,
  command,
  responseUrl,
  token
) => {
  // use dataworld wrapper to unsubscribe to project
  let commandParams = helper.extractParamsFromCommand(command, false);
  try {
    const response = await dataworld.unsubscribeFromProject(
      commandParams.owner,
      commandParams.id,
      token
    );
    await removeSubscriptionRecord(
      commandParams.owner,
      commandParams.id,
      userId,
      channelId
    );
    // send successful unsubscription message to Slack
    await sendSlackMessage(responseUrl, response.data.message);
  } catch (error) {
    console.error("Error unsubscribing from project : ", error.message);
    await sendSlackMessage(
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
  let commandParams = helper.extractParamsFromCommand(command, true);
  let resourceId = `${commandParams.id}`;
  const [
    hasSubscriptionInChannel,
    removeDWSubscription
  ] = await helper.getSubscriptionStatus(resourceId, channelid, userId);
  if (hasSubscriptionInChannel) {
    try {
      if (removeDWSubscription) {
        await dataworld.unsubscribeFromAccount(commandParams.id, token);
      }
      await removeSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userId,
        channelid
      );
      // send successful unsubscription message to Slack
      const message = "Webhook subscription deleted successfully.";
      await sendSlackMessage(responseUrl, message);
    } catch (error) {
      console.error("Error unsubscribing from account : ", error.message);
      await sendSlackMessage(
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

const listSubscription = async (
  responseUrl,
  channelid,
  userId,
  replaceOriginal
) => {
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
      const commandText = process.env.SLASH_COMMAND;
      // when updating previous list of subscriptions, remove message completely if there no more subscriptions.
      message = replaceOriginal
        ? `All subscriptions have been removed from channel.`
        : `No subscription found. Use \`\/${commandText} help\` to see how to subscribe.`;
    }
    await sendSlackMessage(responseUrl, message, attachments, replaceOriginal);
  } catch (error) {
    console.error("Error getting subscriptions : ", error.message);
    await sendSlackMessage(responseUrl, "Failed to get subscriptions.");
  }
};

const addSubscriptionRecord = async (owner, id, userId, channelId) => {
  // create subscription
  let resourceId = owner ? `${owner}/${id}` : `${id}`;
  const [subscription, created] = await Subscription.findOrCreate({
    where: { resourceId: resourceId, channelId: channelId },
    defaults: { slackUserId: userId }
  });
  if (!created) {
    // Subscription record already exits.
    console.warn("Subscription record already exists : ", subscription);
  }
};

const removeSubscriptionRecord = async (owner, id, userId, channelId) => {
  // delete subscription
  const resourceId = owner ? `${owner}/${id}` : `${id}`;
  await Subscription.destroy({
    where: { resourceId: resourceId, slackUserId: userId, channelId: channelId }
  });
};

const sendSlackMessage = async (
  responseUrl,
  message,
  attachments,
  replaceOriginal
) => {
  let data = { text: message };
  if (attachments && !lang.isEmpty(attachments)) {
    data.attachments = attachments;
  }
  data.replace_original = replaceOriginal ? replaceOriginal : false;
  try {
    await slack.sendResponse(responseUrl, data);
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
  // Invalid / Unrecognized command is not expected to make it here.
  const command = req.body.command + helper.cleanSlackLinkInput(req.body.text);
  const commandType = getType(
    command,
    helper.cleanSlackLinkInput(req.body.text)
  );
  const responseUrl = req.body.response_url;

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

const showHelp = async responseUrl => {
  const message = `*Commands*`;
  const commandText = process.env.SLASH_COMMAND;
  const attachments = [];

  const commandsInfo = [
    `_Subscribe to a data.world dataset :_ \n \`/${commandText} subscribe [owner/datasetid]\``,
    `_Subscribe to a data.world project._ : \n \`/${commandText} subscribe [owner/projectid]\``,
    `_Subscribe to a data.world account._ : \n \`/${commandText} subscribe [account]\``,
    `_Unsubscribe from a data.world dataset._ : \n \`/${commandText} unsubscribe [owner/datasetid]\``,
    `_Unsubscribe from a data.world project._ : \n \`/${commandText} unsubscribe [owner/projectid]\``,
    `_Unsubscribe from a data.world account._ : \n \`/${commandText} unsubscribe [account]\``,
    `_List active subscriptions._ : \n \`/${commandText} list\``,
    `_Show this help message_ : \n \`/${commandText} help\``
  ];

  collection.forEach(commandsInfo, value => {
    attachments.push({
      color: "#79B8FB",
      text: value
    });
  });

  await sendSlackMessage(responseUrl, message, attachments);
};

const handleButtonAction = async (payload, action, user) => {
  if (payload.callback_id === "dataset_subscribe_button") {
    await subscribeToProjectOrDataset(
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

const handleMenuAction = async (payload, action, user) => {
  if (payload.callback_id === "unsubscribe_menu") {
    const value = action.selected_options[0].value;
    if (value.includes("/")) {
      //unsubscribe from project of dataset
      await unsubscribeFromDatasetOrProject(
        payload.user.id,
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
        user.dwAccessToken
      );
    } else {
      // unsubscribe from account
      await unsubscribeFromAccount(
        payload.user.id,
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
        user.dwAccessToken
      );
    }
    await listSubscription(
      payload.response_url,
      payload.channel.id,
      payload.user.id,
      true
    );
  } else {
    // unknow action
    console.warn("Unknown callback_id in menu action event.");
    return;
  }
};

const performAction = async (req, res) => {
  // respond with 200 within 3secs
  res.status(200).send();
  // If it's ssl check no need for further processing.
  if (req.body.ssl_check) {
    return;
  }
  const payload = JSON.parse(req.body.payload); // parse URL-encoded payload JSON string
  try {
    if (
      await isBotPresent(
        payload.team.id,
        payload.channel.id,
        payload.user.id,
        payload.response_url
      )
    ) {
      const [isAssociated, user] = await auth.checkSlackAssociationStatus(
        payload.user.id
      );
      if (isAssociated) {
        // subscribe or unsubscribe to/from resource.
        collection.forEach(payload.actions, async action => {
          switch (action.type) {
            case "button":
              await handleButtonAction(payload, action, user);
              break;
            case "select":
              await handleMenuAction(payload, action, user);
              break;
            default:
              console.warn("Unknown action type : ", action.type);
              break;
          }
        });
      } else {
        // User is not associated begin association process.
        beginSlackAssociation(
          payload.user.id,
          payload.user.name,
          payload.channel.id,
          payload.team.id,
          payload.response_url
        );
      }
    }
  } catch (error) {
    // An internal error has occured send a descriptive message
    console.error("Failed to perform action : ", error);
    sendErrorMessage(req);
  }
};

const isBotPresent = async (teamId, channelid, slackUserId, responseUrl) => {
  // Check if bot was invited to slack channel
  // channel found, continue and process command
  const team = await Team.findOne({
    where: { teamId: teamId }
  });
  const isPresent = await slack.botBelongsToChannel(
    channelid,
    process.env.SLACK_BOT_TOKEN || team.botAccessToken
  );

  if (isPresent) {
    // Find or create channel record in DB.(In a case where DB gets cleared, existing bot channels will be re-created in DB).
    const [channel, created] = await Channel.findOrCreate({
      where: { channelId: channelid },
      defaults: { teamId: teamId, slackUserId: slackUserId }
    });
    if (created) {
      console.warn("Re-created existing bot channel!!!");
    }
  } else {
    // inform user that bot user must be invited to channel
    const commandText = process.env.SLASH_COMMAND;
    const message = slack.isDMChannel(channelid)
      ? `Oops!, you can't run \`/${commandText}\` in this channel. Alternatively, you can use it in your DM with <@${
          team.botUserId
        }>.`
      : `Sorry <@${slackUserId}>, you can't run \`/${commandText}\` until you've invited <@${
          team.botUserId
        }> to this channel.`;
    sendSlackMessage(responseUrl, message);
  }
  return isPresent;
};

const validateAndProcessCommand = async (req, res, next) => {
  // respond to request immediately no need to wait.
  res.json({
    response_type: "ephemeral",
    text: `*\`${req.body.command} ${req.body.text}\`*`
  });
  try {
    if (
      await isBotPresent(
        req.body.team_id,
        req.body.channel_id,
        req.body.user_id,
        req.body.response_url
      )
    ) {
      // Authenticate the Slack user
      // An assumption is being made: all commands require authentication
      // check association status
      const [isAssociated, user] = await auth.checkSlackAssociationStatus(
        req.body.user_id
      );

      const option = req.body.text;
      if (
        dwSupportCommandRegex.test(req.body.command + option) &&
        option != "list"
      ) {
        showHelp(req.body.response_url);
      } else {
        if (isAssociated) {
          // User is associated, carry on and validate command
          if (
            dwCommandRegex.test(
              req.body.command + helper.cleanSlackLinkInput(option)
            )
          ) {
            // Process command
            subscribeOrUnsubscribe(req, user.dwAccessToken);
          } else if (
            dwSupportCommandRegex.test(req.body.command + option) &&
            option === "list"
          ) {
            listSubscription(
              req.body.response_url,
              req.body.channel_id,
              req.body.user_id,
              false
            );
          } else {
            // Show help if there's no match found.
            showHelp(req.body.response_url);
          }
        } else {
          // User is not associated begin association process.
          beginSlackAssociation(
            req.body.user_id,
            req.body.user_name,
            req.body.channel_id,
            req.body.team_id,
            req.body.response_url
          );
        }
      }
    }
  } catch (error) {
    // An internal error has occured send a descriptive message
    console.error("Failed to process command : ", error);
    sendErrorMessage(req);
  }
};

const sendErrorMessage = req => {
  message = `Sorry <@${req.body.user_id}>, we're unable to process command \`${
    req.body.command
  }\` right now. Kindly, try again later.`;
  sendSlackMessage(req.body.response_url, message);
};

const beginSlackAssociation = (
  userId,
  userName,
  channelId,
  teamId,
  responseUrl
) => {
  if (!slack.isDMChannel(channelId)) {
    // Don't send this message if we're in bot DM channel
    const message = `Sorry <@${userId}>, authentication is required for this action. I can help you, just check my DM for the next step, and then you can try the command again.`;
    sendSlackMessage(responseUrl, message);
  }
  auth.beginSlackAssociation(userId, userName, teamId);
};

// Visible for testing
module.exports = {
  isBotPresent,
  sendErrorMessage,
  subscribeToProjectOrDataset,
  subscribeToDataset,
  subscribeToAccount,
  unsubscribeFromDatasetOrProject,
  unsubscribeFromProject,
  unsubscribeFromAccount,
  listSubscription,
  addSubscriptionRecord,
  removeSubscriptionRecord,
  sendSlackMessage,
  sendSlackAttachment,
  sendSlackAttachments,
  getType,
  subscribeOrUnsubscribe,
  showHelp,
  handleButtonAction,
  handleMenuAction,
  performAction,
  validateAndProcessCommand
};
