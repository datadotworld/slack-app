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
const AuthMessage = require("../models").AuthMessage;
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const Team = require("../models").Team;
const User = require("../models").User;

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
    // Get resource from DW to be able to confirm type
    const response = await dataworld.getDataset(
      commandParams.id,
      commandParams.owner,
      token
    );
    const dataset = response.data;
    // check if same user has an existing / active subscription for this resource in DW
    const existsInDW = await dataworld.verifySubscriptionExists(
      `${commandParams.owner}/${commandParams.id}`,
      token,
      dataset.isProject
    );
    if (!existsInDW) {
      if (dataset.isProject) {
        // use dataworld wrapper to subscribe to project
        await dataworld.subscribeToProject(
          commandParams.owner,
          commandParams.id,
          token
        );
      } else {
        // use dataworld wrapper to subscribe to dataset
        await dataworld.subscribeToDataset(
          commandParams.owner,
          commandParams.id,
          token
        );
      }
    }
    // check if subscription already exist in channel
    const channelSubscription = await Subscription.findOne({
      where: {
        resourceId: `${commandParams.owner}/${commandParams.id}`,
        channelId: channelid
      }
    });
    // This check will help ensure the appropiate message is sent to Slack in situations where
    // The subscription already exist locally in DB but not on DW api side, which means it wouldn't have showed up in a /data.world list command in channel.
    let message =
      !existsInDW || !channelSubscription
        ? `All set! You'll now receive notifications about *${
            commandParams.id
          }* here.`
        : "Subscription already exists in this channel. No further action required!";
    if (!channelSubscription) {
      // subscription not found in channel
      // Add subscription record to DB.
      await addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
    }
    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message);
  } catch (error) {
    // Failed to subscribe as project, Handle as dataset
    console.warn("Failed to subscribe to Project or Dataset : ", error.message);
    await sendSlackMessage(
      responseUrl,
      `Failed to subscribe to *${
        commandParams.id
      }*. Please make sure to subscribe using a valid dataset or project URL.`
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
    // check if same user has an existing / active subscription for this resource in DW
    const existsInDW = await dataworld.verifySubscriptionExists(
      commandParams.id,
      token,
      false
    );
    if (!existsInDW) {
      await dataworld.subscribeToAccount(commandParams.id, token);
    }

    const channelSubscription = await Subscription.findOne({
      where: { resourceId: commandParams.id, channelId: channelid }
    });
    // This `response.data.user` check will help ensure the appropiate message is sent to Slack in situations where
    // The subscription already exist locally in DB but not on DW api side, which means it wouldn't have showed up in a /data.world list command in channel.
    let message =
      !existsInDW || !channelSubscription
        ? `All set! You'll now receive notifications about *${
            commandParams.id
          }* here.`
        : "Subscription already exists in this channel. No further action required!";
    if (!channelSubscription) {
      addSubscriptionRecord(
        commandParams.owner,
        commandParams.id,
        userid,
        channelid
      );
    }
    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message);
  } catch (error) {
    console.error("Error subscribing to account: ", error.message);
    sendSlackMessage(
      responseUrl,
      `Failed to subscribe to *${
        commandParams.id
      }*. Is that a valid data.world account ID?`
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
    const commandText = process.env.SLASH_COMMAND;

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
      const message = `No problem! You'll no longer receive notifications about *${
        commandParams.id
      }* here.`;
      await sendSlackMessage(responseUrl, message);
    } else {
      await sendSlackMessage(
        responseUrl,
        `No subscription found for *${resourceId}* here. Use \`/${commandText} list\` to list all active subscriptions.`
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
    const resourceId = `${commandParams.owner}/${commandParams.id}`;
    const [
      hasSubscriptionInChannel,
      removeDWSubscription
    ] = await helper.getSubscriptionStatus(resourceId, channelId, userId);

    if (removeDWSubscription) {
      await dataworld.unsubscribeFromProject(
        commandParams.owner,
        commandParams.id,
        token
      );
    }

    await removeSubscriptionRecord(
      commandParams.owner,
      commandParams.id,
      userId,
      channelId
    );
    // send successful unsubscription message to Slack
    await sendSlackMessage(
      responseUrl,
      `No problem! You'll no longer receive notifications about *${
        commandParams.id
      }* here.`
    );
  } catch (error) {
    console.error("Error unsubscribing from project : ", error.message);
    await sendSlackMessage(
      responseUrl,
      `Failed to unsubscribe from *${commandParams.id}*.`
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
  const commandText = process.env.SLASH_COMMAND;

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
      const message = `No problem! You'll no longer receive notifications about *${
        commandParams.id
      }* here.`;
      await sendSlackMessage(responseUrl, message);
    } catch (error) {
      console.error("Error unsubscribing from account : ", error.message);
      await sendSlackMessage(
        responseUrl,
        `Failed to unsubscribe from *${commandParams.id}*.`
      );
    }
  } else {
    sendSlackMessage(
      responseUrl,
      `No subscription found for *${resourceId}* here. Use \`/${commandText} list\` to list all active subscriptions.`
    );
    return;
  }
};

const listSubscription = async (
  responseUrl,
  channelid,
  userId,
  replaceOriginal,
  deleteOriginal
) => {
  try {
    //Get all subscriptions in this channel
    const subscriptions = await Subscription.findAll({
      where: { channelId: channelid }
    });

    const user = await User.findOne({
      where: { slackId: userId }
    });

    let message;
    let attachments;
    let options = [];
    let baseUrl = "https://data.world";

    if (!lang.isEmpty(subscriptions)) {
      message = `*Active Subscriptions*`;
      let attachmentText = "";
      await Promise.all(
        subscriptions.map(async subscription => {
          try {
            let isProject = false;
            if (subscription.resourceId.includes("/")) {
              const data = subscription.resourceId.split("/");
              const id = data.pop();
              const owner = data.pop();

              const response = await dataworld.getDataset(
                id,
                owner,
                user.dwAccessToken
              );
              const dataset = response.data;
              isProject = dataset.isProject;
            }

            // Verify that subscription exists in DW, if not remove subscription from our DB
            const existsInDW = await dataworld.verifySubscriptionExists(
              subscription.resourceId,
              user.dwAccessToken,
              isProject
            );
            if (existsInDW) {
              if (subscription.slackUserId === userId) {
                options.push({
                  text: subscription.resourceId,
                  value: subscription.resourceId
                });
              }
              attachmentText += `• ${baseUrl}/${
                subscription.resourceId
              } \n *created by :* <@${subscription.slackUserId}> \n`;
            }
          } catch (error) {
            // This is expected to fail if the dataset is a private dataset
            console.warn(
              `Failed to retrieve dataset or project : ${
                subscription.resourceId
              }`,
              error
            );
          }
        })
      );

      // check if we have valid subscriptions i.e subscriptions that exists in DB and DW
      if (lang.isEmpty(options) && lang.isEmpty(attachmentText)) {
        message = deleteOriginal
          ? ""
          : `No subscription found. Use \`\/${commandText} help\` to learn how to subscribe.`;
      }

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
      message = deleteOriginal
        ? ""
        : `No subscription found. Use \`\/${commandText} help\` to learn how to subscribe.`;
    }
    await sendSlackMessage(
      responseUrl,
      message,
      attachments,
      replaceOriginal,
      deleteOriginal
    );
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
  replaceOriginal,
  deleteOriginal
) => {
  let data = { text: message };
  if (attachments && !lang.isEmpty(attachments)) {
    data.attachments = attachments;
  }
  data.replace_original = replaceOriginal ? replaceOriginal : false;
  data.delete_original = deleteOriginal ? deleteOriginal : false;
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
  const commandText = process.env.SLASH_COMMAND;

  const message = `Not sure how to use \`/${commandText}\`? Here are some ideas:point_down:`;
  const attachments = [];

  const commandsInfo = [
    `_Subscribe to a data.world dataset:_ \n \`/${commandText} subscribe dataset_url\``,
    `_Subscribe to a data.world project:_ \n \`/${commandText} subscribe project_url\``,
    `_Subscribe to a data.world account:_ \n \`/${commandText} subscribe account\``,
    `_Unsubscribe from a data.world dataset:_ \n \`/${commandText} unsubscribe dataset_url\``,
    `_Unsubscribe from a data.world project:_ \n \`/${commandText} unsubscribe project_url\``,
    `_Unsubscribe from a data.world account:_ \n \`/${commandText} unsubscribe account\``,
    `_List active subscriptions._ : \n \`/${commandText} list\``
  ];

  collection.forEach(commandsInfo, value => {
    attachments.push({
      color: "#355D8A",
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
    // Update list of subscriptions
    await listSubscription(
      payload.response_url,
      payload.channel.id,
      payload.user.id,
      true,
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
    if (payload.callback_id === "auth_required_message") {
      // Handle auth_required_message dismiss button action
      const nonce = payload.actions.shift().value;
      const team = await Team.findOne({
        where: { teamId: payload.team.id }
      });
      const authMessage = await AuthMessage.findOne({
        where: { nonce: nonce }
      });
      const botAccessToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
      const { channel, ts } = authMessage;

      await authMessage.destroy();
      await slack.dismissAuthRequiredMessage(botAccessToken, ts, channel);
      return;
    }

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
        await beginSlackAssociation(
          payload.user.id,
          payload.channel.id,
          payload.team.id
        );
      }
    }
  } catch (error) {
    // An internal error has occured send a descriptive message
    console.error("Failed to perform action : ", error);
    sendErrorMessage(payload);
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
      ? `Oops! \`/${commandText}\` cannot be used here. Use it in public or private channels, or in DMs with <@${
          team.botUserId
        }>.`
      : `Sorry <@${slackUserId}>, you can't run \`/${commandText}\` until you've invited <@${
          team.botUserId
        }> to this channel. Run \`/invite <@${
          team.botUserId
        }>\`, then try again.`;
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
          await beginSlackAssociation(
            req.body.user_id,
            req.body.channel_id,
            req.body.team_id
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

const sendErrorMessage = payload => {
  message = `Sorry <@${payload.user_id}>, I am unable to process command \`${
    payload.command
  }\` right now. Please, try again later.`;
  sendSlackMessage(req.body.response_url, message);
};

const beginSlackAssociation = async (
  userId,
  channelId,
  teamId,
) => {
  await auth.beginSlackAssociation(userId, teamId, channelId);
};

// Visible for testing
module.exports = {
  isBotPresent,
  sendErrorMessage,
  subscribeToProjectOrDataset,
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
