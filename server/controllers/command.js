const User = require("../models").User;
const Channel = require('../models').Channel;
const Subscription = require('../models').Subscription;
const collection = require('lodash/collection');
const lang = require('lodash/lang');
const { slack } = require("../api/slack");
const { auth } = require("./auth");
const { dataworld } = require('../api/dataworld');

// data.world command format
const dwWebhookCommandFormat = /^((\/data.world)(subscribe|unsubscribe|list|help) [\w-\/]+)$/i;
const dwSupportCommandFormat = /^((\/data.world)(list|help))$/i;

// sub command format
const subscribeFormat = /^((\/data.world)(subscribe) [\w-\/]+)$/i;
const unsubscribeFormat = /^((\/data.world)(unsubscribe) [\w-\/]+)$/i;

// /data.world sub command types 
const SUBSCRIBE_DATASET_OR_PROJECT = "SUBSCRIBE_DATASET_OR_PROJECT";
const SUBSCRIBE_ACCOUNT = "SUBSCRIBE_ACCOUNT";

const UNSUBSCRIBE_DATASET_OR_PROJECT = "UNSUBSCRIBE_DATASET_OR_PROJECT";
const UNSUBSCRIBE_ACCOUNT = "UNSUBSCRIBE_ACCOUNT";

const subscribeToDatasetOrProject = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.subscribeToProject(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to project / dataset response : ", response);
      addSubscriptionRecord(commandParams.id, userid, channelid);
      // send successful subscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.warn("Failed to subscribe to project : ", error);
      // Handle as dataset 
      subscribeToDataset(userid, channelid, command, responseUrl, token);
    });
}

const subscribeToDataset = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.subscribeToDataset(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to dataset response : ", response);
      addSubscriptionRecord(commandParams.id, userid, channelid)
      // send successful subscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.warn("Failed to subscribe to dataset : ", error);
      sendSlackMessage(responseUrl, "Failed to subscribe to dataset : " + commandParams.id);
    });
}

const subscribeToAccount = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  return dataworld.subscribeToAccount(commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to account response : ", response);
      addSubscriptionRecord(commandParams.id, userid, channelid)
        // send successful subscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.error("Error subscribing to account : ", error);
      sendSlackMessage(responseUrl, "Failed to subscribe to : " + commandParams.id);
    });
}

const unsubscribeFromDatasetOrProject = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.unsubscribeFromDataset(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from dataset response : ", response);
      removeSubscriptionRecord(commandParams.id, channelid, userid);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.warn("Failed to unsubscribe from dataset : ", error);
      // Handle as project 
      unsubscribeFromProject(command, responseUrl, token);
    });
}

const unsubscribeFromProject = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to project
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.unsubscribeFromProject(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from project response : ", response);
      removeSubscriptionRecord(commandParams.id, channelid, userid);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from project : ", error);
      sendSlackMessage(responseUrl, "Failed to unsubscribe from : " + commandParams.id);
    });
}

const unsubscribeFromAccount = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  return dataworld.unsubscribeFromAccount(commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from account response : ", response);
      removeSubscriptionRecord(commandParams.id, channelid, userid);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from account : ", error);
      sendSlackMessage(responseUrl, "Failed to unsubscribe from account : " + commandParams.id);
    });
}

const belongsToChannel = async(resourceid, channelid, userid) => {
  const subscription = await Subscription.findOne({ where: { resourceId: resourceid, channelId: channelid , slackUserId: userid} });
  if (subscription) {
    return true;
  } else {
    return false;
  }
}

const listSubscription = async(req, token) => {
  let command = req.body.command + req.body.text;
  let responseUrl = req.body.response_url;
  let channelid = req.body.channel_id;
  let userId = req.body.user_id;

  try {
    let response = await dataworld.getSubscriptions(token)
      // Construst subscriptions list message
    console.log("DW Subscriptions response : ", response);
    let message;
    let attachments;
    let baseUrl = 'https://data.world';

    if (response.count > 0) {
      message = `*Active Subscriptions*`;
      let attachment = "";

      // extract datasets list from response
      let datasetObjs = collection.map(response.records, 'dataset');
      if (!lang.isEmpty(datasetObjs)) {
        for (let value of datasetObjs) {
          if (value) {
            const isValid = await belongsToChannel(value.id, channelid, userId);

            if (isValid) {
              attachment += `${baseUrl}/${value.owner}/${value.id} \n`;
            }
          }
        };
      }

      // extract accounts list from response
      let projectsObjs = collection.map(response.records, 'project');
      if (!lang.isEmpty(projectsObjs)) {
        for (let value of projectsObjs) {
          if (value) {
            const isValid = await belongsToChannel(value.id, channelid, userId);

            if (isValid) {
              attachment += `${baseUrl}/${value.owner}/${value.id} \n`;
            }
          }
        };
      }

      // extract projects list from response 
      let accountsObjs = collection.map(response.records, 'user');
      if (!lang.isEmpty(accountsObjs)) {
        for (let value of accountsObjs) {
          if (value) {
            const isValid = await belongsToChannel(value.id, channelid, userId);

            if (isValid) {
              attachment += `${baseUrl}/${value.id} \n`;
            }
          }
        };
      }

      if (attachment) {
        attachments = [{
          color: "#79B8FB",
          text: attachment,
        }];
      } else {
        message = `No subscription found in this channel.`
      }
    } else {
      message = `No subscription found. Use \`\/data.world help\` to see how to subscribe.`
    }

    sendSlackMessage(responseUrl, message, attachments);

  } catch (error) {
    console.error("Error getting subscriptions : ", error);
    sendSlackMessage(responseUrl, "Failed to get subscription list.");
  };
}

const addSubscriptionRecord = (id, userId, channelId) => {
  // create subscription 
  Subscription.findOrCreate({
    where: { resourceId: id },
    defaults: { slackUserId: userId, channelId: channelId }
  }).spread((channel, created) => {
    if (!created) {
      // Channel record already exits.
      console.warn("Subscription record already exists : ", event);
    }
  }).catch((error) => {
    // error creating channel
    console.error("Failed to create new Subscription record : ", error);
  });
}

const removeSubscriptionRecord = (id, channelid, userid) => {
  // delete subscription 
  Subscription.destroy({ where: { resourceId: resourceid, channelId: channelid , slackUserId: userid } }).catch((error) => {
    // error deleting Subscription
    console.error("Failed to create new Subscription record : ", error);
  });
}

//TODO : This needs to be refactored.
const extractParamsFromCommand = (command, isAccountCommand) => {
  let params = {};
  let parts = command.split(" ");
  let datasetInfo = parts[parts.length - 1];
  let data = datasetInfo.split("/");

  params.owner = isAccountCommand ? null : data[data.length - 2];
  params.id = data[data.length - 1];

  return params;
};

const sendSlackMessage = (responseUrl, message, attachments) => {
  let data = { text: message };
  if (attachments && !lang.isEmpty(attachments)) {
    data.attachments = attachments;
  }
  slack.sendResponse(responseUrl, data);
}

const getType = (command, option) => {
  // determine type of command
  if (subscribeFormat.test(command)) {
    return option.indexOf("/") > 0 ? SUBSCRIBE_DATASET_OR_PROJECT : SUBSCRIBE_ACCOUNT;
  } else if (unsubscribeFormat.test(command)) {
    return option.indexOf("/") > 0 ? UNSUBSCRIBE_DATASET_OR_PROJECT : UNSUBSCRIBE_ACCOUNT;
  }
  console.error("Unknown command type : ", command);
  return;
};

const subscribeOrUnsubscribe = (req, token) => {
  //Invalid / Unrecognized command is not expected to make it here.
  let command = req.body.command + req.body.text;
  let commandType = getType(command, req.body.text);
  let responseUrl = req.body.response_url;

  switch (commandType) {
    case SUBSCRIBE_DATASET_OR_PROJECT:
      subscribeToDatasetOrProject(req.body.user_id, req.body.channel_id, command, responseUrl, token);
      break;
    case SUBSCRIBE_ACCOUNT:
      subscribeToAccount(req.body.user_id, req.body.channel_id, command, responseUrl, token);
      break;
    case UNSUBSCRIBE_DATASET_OR_PROJECT:
      unsubscribeFromDatasetOrProject(req.body.user_id, req.body.channel_id, command, responseUrl, token);
      break;
    case UNSUBSCRIBE_ACCOUNT:
      unsubscribeFromAccount(req.body.user_id, req.body.channel_id, command, responseUrl, token);
      break;
    default:
      console.error("Attempt to process unknown command.", command);
      break;
  }
};

const showHelp = responseUrl => {
  let message = `*Commands*`;
  let attachments = [];

  let commandsInfo = ["_Subscribe to a data.world dataset :_ \n \`\/data.world subscribe [owner/datasetid]\`",
    "_Subscribe to a data.world project._ : \n \`\/data.world subscribe [owner/projectid]\`",
    "_Subscribe to a data.world account._ : \n \`\/data.world subscribe [account]\`",
    "_Unsubscribe from a data.world dataset._ : \n \`\/data.world unsubscribe [owner/datasetid]\`",
    "_Unsubscribe from a data.world project._ : \n \`\/data.world unsubscribe [owner/projectid]\`",
    "_Unsubscribe from a data.world account._ : \n \`\/data.world unsubscribe [account]\`",
    "_List active subscriptions._ : \n \`\/data.world list\`",
    "_Show this help message_ : \n \`\/data.world help\`"
  ];

  collection.forEach(commandsInfo, (value) => {
    attachments.push({
      color: "#79B8FB",
      text: value,
    });
  });

  // we should replace this with ephemeral messsage see chat.postEphemaralMessage
  sendSlackMessage(responseUrl, message, attachments);
}

const command = {
  validate(req, res, next) {
    // respond to request immediately no need to wait.
    res.json({ response_type: "in_channel" });
    Channel.findOne({ where: { channelId: req.body.channel_id } })
      .catch((error) => {
        console.error('Error finding Channel', error);
        // we should replace this with ephemeral messsage see chat.postEphemaralMessage
        sendSlackMessage(req.body.response_url, `Somehting went wrong, kindly try again.`);
      })
      .then((channel) => {
        if (channel) { // Check if bot was invited to slack
          //channel found, continue and process command
          // Authenticate the Slack user
          // An assumption is being made: all commands require authentication
          // check association status
          auth.checkSlackAssociationStatus(req.body.user_id, (error, isAssociated, user) => {
            let message;
            if (error) { // An internal error has occured send a descriptive message
              message = `Sorry <@${req.body.user_id}>, we're unable to process command \`${req.body.command}\` right now. Kindly, try again later.`;
            } else {
              if (isAssociated) { // User is associated, carry on and validate command
                let option = req.body.text;
                if (dwWebhookCommandFormat.test(req.body.command + option)) { // Process command
                  subscribeOrUnsubscribe(req, user.dwAccessToken);
                } else if (dwSupportCommandFormat.test(req.body.command + option)) {
                  option === 'list' ? listSubscription(req, user.dwAccessToken) : showHelp(req.body.response_url);
                } else {
                  message = `Cannot understand the command: \`${req.body.command} ${req.body.text}\` . Please, Ensure command options and specified id are valid.`
                }
              } else {
                // User is not associated begin association process.
                message = `Sorry <@${req.body.user_id}>, you can't run \`${req.body.command}\` until after you authenticate. I can help you, just check my DM for the next step, and then you can try the command again.`;
                auth.beginSlackAssociation(req.body.user_id, req.body.user_name, req.body.team_id);
              }
            }
            if (message) {
              // we should replace this with ephemeral messsage see chat.postEphemaralMessage
              sendSlackMessage(req.body.response_url, message);
            }
          });
        } else {
          // inform user that bot user must be invited to channel 
          // we should replace this with ephemeral messsage see chat.postEphemaralMessage
          sendSlackMessage(req.body.response_url, `Sorry <@${req.body.user_id}>, you can't run \`${req.body.command}\` until you've invited <@dataworld> to this channel.`);
          return;
        }
      });
  },
};

module.exports = { command };
