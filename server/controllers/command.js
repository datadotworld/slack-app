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
const collection = require("lodash/collection");

const auth = require("../services/auth");
const commandService = require("../services/commands");
const actionService = require("../services/actions")
const helper = require("../helpers/helper");
const slack = require("../api/slack");
const webhookCommands = require("./commands/webhook");
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
const dwWebhookCommandRegex = new RegExp(
  `^((\\\/${commandText})(webhook))$`,
  "i"
);
const dwSearchTermCommandRegex = new RegExp(
  `^((\\\/${commandText})(search-term) [\\w-\\\/\\:\\.]+)$`,
  "i"
);


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
      await slack.dismissAuthRequiredMessage(payload.response_url);
      return;
    }

    if (
      !(await commandService.isBotPresent(
        payload.team.id,
        payload.channel.id,
        payload.user.id,
        payload.response_url
      ))
    ) {
      return;
    }
    // Assuming that all actions require user to be data.world authenticated
    const [isAssociated, user] = await auth.checkSlackAssociationStatus(
      payload.user.id
    );
    if (!isAssociated) {
      // User is not associated begin association process.
      await auth.beginSlackAssociation(payload.user.id, payload.team.id, payload.channel.id)
      return;
    }

    collection.forEach(payload.actions, async action => {
      if (action.type === "button") {
        await actionService.handleButtonAction(payload, action, user);
      } else if (action.type === "static_select") {
        await actionService.handleMenuAction(payload, action);
      } else {
        console.warn("Unknown action type : ", action.action_id)
      }
    })
  } catch (error) {
    // An internal error has occured send a descriptive message
    console.error("Failed to perform action : ", error);
    commandService.sendErrorMessage(payload);
  }
};

const validateAndProcessCommand = async (req, res, next) => {
  // respond to request immediately no need to wait.
  res.json({
    response_type: "ephemeral",
    text: `*\`${req.body.command} ${req.body.text}\`*`
  });
  try {
    if (
      await commandService.isBotPresent(
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
        commandService.showHelp(req.body.response_url);
      } else {
        if (isAssociated) {
          // User is associated, carry on and validate command
          if (
            dwCommandRegex.test(
              req.body.command + helper.cleanSlackLinkInput(option)
            )
          ) {
            // Process command
            commandService.subscribeOrUnsubscribe(req, user.dwAccessToken);
          } else if (
            dwSupportCommandRegex.test(req.body.command + option) &&
            option === "list"
          ) {
            commandService.handleListSubscriptionCommand(
              req.body.response_url,
              req.body.channel_id,
              req.body.user_id,
              false
            );
          } else if (dwWebhookCommandRegex.test(req.body.command + option)) {
            webhookCommands.getOrCreateWebhookForChannel(
              req.body.channel_id,
              req.body.response_url
            );
          } else if (dwSearchTermCommandRegex.test(req.body.command + option)) {
            commandService.handleSearchTermCommand(req, user.dwAccessToken);
          } else {
            // Show help if there's no match found.
            commandService.showHelp(req.body.response_url);
          }
        } else {
          // User is not associated begin association process.
          await auth.beginSlackAssociation(req.body.user_id,
            req.body.team_id, req.body.channel_id);
        }
      }
    }
  } catch (error) {
    // An internal error has occured send a descriptive message
    console.error("Failed to process command : ", error);
    commandService.sendErrorMessage(req.body);
  }
};

// Visible for testing
module.exports = {
  performAction,
  validateAndProcessCommand
};
