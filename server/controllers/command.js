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
      console.warn("Failed to subscribe to project : ", error.message);
      // Handle as dataset 
      subscribeToDataset(command, responseUrl, token);
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
      console.warn("Failed to subscribe to dataset : ", error.message);
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
      console.error("Error subscribing to account : ", error.message);
      sendSlackMessage(responseUrl, "Failed to subscribe to : " + commandParams.id);
    });
}

const unsubscribeFromDatasetOrProject = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.unsubscribeFromDataset(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from dataset response : ", response);
      removeSubscriptionRecord(commandParams.id);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.warn("Failed to unsubscribe from dataset : ", error.message);
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
      removeSubscriptionRecord(commandParams.id);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from project : ", error.message);
      sendSlackMessage(responseUrl, "Failed to unsubscribe from : " + commandParams.id);
    });
}

const unsubscribeFromAccount = (userid, channelid, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  return dataworld.unsubscribeFromAccount(commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from account response : ", response);
      removeSubscriptionRecord(commandParams.id);
      // send successful unsubscription message to Slack
      sendSlackMessage(responseUrl, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from account : ", error.message);
      sendSlackMessage(responseUrl, "Failed to unsubscribe from account : " + commandParams.id);
    });
}

const listSubscription = (req, token) => {
  let command = req.body.command + req.body.text;
  let responseUrl = req.body.response_url;
  return dataworld.getSubscriptions(token).then((response) => {
    // extract datasets list from response
    // extract projects list from response 
    // extract accounts list from response
    // Construst subscriptions list message
    console.log("DW Subscriptions response : ", response);
    let message;
    if (response.count > 0) {
      message = `*Active Subscriptions*\n`;

      let datasetObjs = collection.map(response.records, 'dataset');
      if (!lang.isEmpty(datasetObjs)) {
        message += `Datasets :\n`;
        let count = 1; // we could have used index inplace of count, but index is not reliable cos not all objects in this collection are datasets.
        collection.forEach(datasetObjs, (value) => {
          if (value) {
            message += `${count}. ${value.owner}/${value.id}\n`;
            count++;
          }
        });
      }

      let projectsObjs = collection.map(response.records, 'project');
      if (!lang.isEmpty(projectsObjs)) {
        message += `Projects :\n`;
        let count = 1; // we could have used index inplace of count, but index is not reliable cos not all objects in this collection are datasets.
        collection.forEach(projectsObjs, (value) => {
          if (value) {
            message += `${count}. ${value.owner}/${value.id}\n`;
            count++;
          }
        });
      }

      let accountsObjs = collection.map(response.records, 'user');
      if (!lang.isEmpty(accountsObjs)) {
        message += `Accounts :\n`;
        let count = 1; // we could have used index inplace of count, but index is not reliable cos not all objects in this collection are datasets.
        collection.forEach(accountsObjs, (value) => {
          if (value) {
            message += `${count}. ${value.id}\n`;
            count++;
          }
        });
      }
    } else {
      message = `No subscription found. Use \`\/data.world help\` to see how to subscribe.`
    }

    sendSlackMessage(responseUrl, message);
  }).catch(error => {
    console.error("Error getting subscriptions : ", error.message);
    sendSlackMessage(responseUrl, "Failed to get subscription list.");
  });
}

const addSubscriptionRecord = (id, userId, channelId) => {
  // create subscription 
  Subscription.findOrCreate({
    where: { resourceId: id },
    defaults: { slackUserId: channelId, channelId: channelId }
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

const removeSubscriptionRecord = (id) => {
  // delete subscription 
  Subscription.findAndDelete({ where: { resourceId: id } }).catch((error) => {
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

//TODO: Add sending of ephemeral messsage see chat.postEphemaralMessage
const sendSlackMessage = (responseUrl, message) => {
  let data = { response_type: "in_channel", text: message };
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
  let message = `*Commands*
  \`\/data.world subscribe [owner/datasetid]\` : _Subscribe to a data.world dataset._\n
  \`\/data.world subscribe [owner/projectid]\` : _Subscribe to a data.world project._\n
  \`\/data.world subscribe [account]\` : _Subscribe to a data.world account._\n
  \`\/data.world unsubscribe [owner/datasetid]\` : _Unsubscribe from a data.world dataset._\n
  \`\/data.world unsubscribe [owner/projectid]\` : _Unsubscribe from a data.world project._\n
  \`\/data.world unsubscribe [account]\` : _Unsubscribe from a data.world account._\n
  \`\/data.world list\` : _List active subscriptions._\n
  \`\/data.world help\` : _Show data.world sub command and usage._\n`;

  // we should replace this with ephemeral messsage see chat.postEphemaralMessage
  sendSlackMessage(responseUrl, message);
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
          sendSlackMessage(req.body.response_url, `Sorry <@${req.body.user_id}>, you can't run \`${req.body.command}\` until you've invited @dataworld to this channel.`);
          return;
        }
      });


  },
};

module.exports = { command };
