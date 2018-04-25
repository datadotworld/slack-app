const User = require("../models").User;
const { slack } = require("../api/slack");
const { auth } = require("./auth");
const { dataworld } = require('../api/dataworld');

// data.world command format
const dataworldCommandFormat = /^((\/data.world)(subscribe|unsubscribe) (dataset|account|project) [\w-\/]+)$/i;

// sub command format
const subscribeDatasetFormat = /^((\/data.world)(subscribe) (dataset) [\w-\/]+)$/i;
const subscribeAccountFormat = /^((\/data.world)(subscribe) (account) [\w-\/]+)$/i;
const subscribeProjectFormat = /^((\/data.world)(subscribe) (project) [\w-\/]+)$/i;

const unsubscribeDatasetFormat = /^((\/data.world)(unsubscribe) (dataset) [\w-\/]+)$/i;
const unsubscribeAccountFormat = /^((\/data.world)(unsubscribe) (account) [\w-\/]+)$/i;
const unsubscribeProjectFormat = /^((\/data.world)(unsubscribe) (project) [\w-\/]+)$/i;

// /data.world sub command types 
const SUBSCRIBE_DATASET = "SUBSCRIBE_DATASET";
const SUBSCRIBE_PROJECT = "SUBSCRIBE_PROJECT";
const SUBSCRIBE_ACCOUNT = "SUBSCRIBE_ACCOUNT";

const UNSUBSCRIBE_DATASET = "UNSUBSCRIBE_DATASET";
const UNSUBSCRIBE_PROJECT = "UNSUBSCRIBE_PROJECT";
const UNSUBSCRIBE_ACCOUNT = "UNSUBSCRIBE_ACCOUNT";

const subscribeToDataset = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.subscribeToDataset(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to dataset response : ", response);
      // send successful subscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error subscribing to dataset : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to subscribe to dataset : " + commandParams.id);
    });
}

const subscribeToProject = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to project
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.subscribeToProject(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to project response : ", response);
      // send successful subscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error subscribing to project : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to subscribe to project : " + commandParams.id);
    });
}

const subscribeToAccount = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to subscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  return dataworld.subscribeToAccount(commandParams.id, token)
    .then((response) => {
      console.log("DW subscribe to account response : ", response);
      // send successful subscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error subscribing to account : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to subscribe to account : " + commandParams.id);
    });
}

const unSubscribeFromDataset = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to dataset
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.unSubscribeFromDataset(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from dataset response : ", response);
      // send successful unsubscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from dataset : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to unsubscribe from dataset : " + commandParams.id);
    });
}

const unSubscribeFromProject = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to project
  let commandParams = extractParamsFromCommand(command, false);
  return dataworld.unSubscribeFromProject(commandParams.owner, commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from project response : ", response);
      // send successful unsubscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from project : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to unsubscribe from project : " + commandParams.id);
    });
}

const unSubscribeFromAccount = (slackId, command, responseUrl, token) => {
  // use dataworld wrapper to unsubscribe to account
  let commandParams = extractParamsFromCommand(command, true);
  return dataworld.unSubscribeFromAccount(commandParams.id, token)
    .then((response) => {
      console.log("DW unsubscribe from account response : ", response);
      // send successful unsubscription message to Slack
      sendSlackMessage(req.body.response_url, response.message);
    }).catch(error => {
      console.error("Error unsubscribing from account : ", error.message);
      sendSlackMessage(req.body.response_url, "Failed to unsubscribe from account : " + commandParams.id);
    });
}

//TODO : This needs to be refactored.
const extractParamsFromCommand = (command, isAccountCommand) => {
  let params = {};
  let parts = command.split(" ");
  let datasetInfo = parts[parts.length - 1];
  let data = datasetInfo.split("/");

  params.owner = isAccountCommand ? null : data[0];
  params.id = isAccountCommand ? data[0] : data[1];

  return params;
};

const sendSlackMessage = (responseUrl, message) => {
  let data = { response_type: "in_channel", text: message };
  slack.sendResponse(responseUrl, data);
}

const getType = (command) => {
  // determine type of link
  if (subscribeDatasetFormat.test(command)) {
    return SUBSCRIBE_DATASET;
  } else if (subscribeProjectFormat.test(command)) {
    return SUBSCRIBE_PROJECT;
  } else if (subscribeAccountFormat.test(command)) {
    return SUBSCRIBE_ACCOUNT;
  } else if (unsubscribeDatasetFormat.test(command)) {
    return UNSUBSCRIBE_DATASET;
  } else if (unsubscribeProjectFormat.test(command)) {
    return UNSUBSCRIBE_PROJECT;
  } else if (unsubscribeAccountFormat.test(command)) {
    return UNSUBSCRIBE_ACCOUNT;
  }
  console.error("Unknown command type : ", command);
  return;
};

const process = (req, token) => {
  //Invalid / Unrecognized command is not expected to make it here.
  let command = req.body.command + req.body.text;
  let commandType = getType(command);
  let slackId = req.body.user_id;
  let responseUrl = req.body.response_url;

  switch (commandType) {
    case SUBSCRIBE_DATASET:
      subscribeToDataset(slackId, command, responseUrl, token);
      break;
    case SUBSCRIBE_PROJECT:
      subscribeToProject(slackId, command, responseUrl, token);
      break;
    case SUBSCRIBE_ACCOUNT:
      subscribeToAccount(slackId, command, responseUrl, token);
      break;
    case UNSUBSCRIBE_DATASET:
      unSubscribeFromDataset(slackId, command, responseUrl, token);
      break;
    case UNSUBSCRIBE_PROJECT:
      unSubscribeFromProject(slackId, command, responseUrl, token);
      break;
    case UNSUBSCRIBE_ACCOUNT:
      unSubscribeFromAccount(slackId, command, responseUrl, token);
      break;
    default:
      console.error("Attempt to process unknown command.", command);
      break;
  }
};

const command = {
  validate(req, res, next) {
    // respond to request immediately no need to wait.
    res.json({ response_type: "in_channel" });
    // Authenticate the Slack user
    // An assumption is being made: all commands require authentication
    // check association status
    auth.checkSlackAssociationStatus(req.body.user_id, (error, isAssociated, user) => {
      let message;
      if (error) { // An internal error has occured send a descriptive message
        message = `Sorry <@${req.body.user_id}>, we're unable to process command \`${req.body.command}\` right now. Kindly, try again later.`;
      } else {
        if (isAssociated) { // User is associated, carry on and validate command
          if (dataworldCommandFormat.test(req.body.command + req.body.text)) { // Process command
            // add dw access token for request obj.
            process(req, user.dwAccessToken);
          } else {
            message = `Cannot understand the command: \`${req.body.command}\` . Please, Ensure command options and specified id are valid.`
          }
        } else {
          // User is not associated begin association process.
          message = `Sorry <@${req.body.user_id}>, you cannot run \`${req.body.command}\` until after you authenticate. I can help you, just check my DM for the next step, and then you can try the command again.`;
          auth.beginSlackAssociation(req.body.user_id, req.body.user_name, req.body.team_id);
        }
      }
      if (message) {
        sendSlackMessage(req.body.response_url, message);
        next(new Error('Validation failed.'));
      }
    });
  },
};

module.exports = { command };
