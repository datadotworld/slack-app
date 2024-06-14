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
const dataworld = require("../../api/dataworld");
const helper = require("../../helpers/helper");
const slack = require("../../api/slack");
const commandService = require("../../services/commands");
const subscriptionService = require("../../services/subscription");
const Subscription = require("../../models").Subscription;
const User = require("../../models").User;
const dwDomain = helper.DW_DOMAIN;

describe("Test Auth controller methods", () => {
  it(
    "should subscribe to project",
    async done => {
      const userid = "userid";
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "All set! You'll now receive notifications about *datasetid* here.";
      const isProject = true;

      Subscription.findOne = jest.fn(() => Promise.resolve());
      Subscription.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
      dataworld.subscribeToProject = jest.fn(() => Promise.resolve());
      dataworld.getDataset = jest.fn(() => Promise.resolve({ data: { isProject } }));
      dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(false));
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await commandService.handleDatasetorProjectSubscribeCommand(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
      expect(dataworld.getDataset).toHaveBeenCalledTimes(1);
      expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
      expect(dataworld.subscribeToProject).toHaveBeenCalledWith(
        "owner",
        "datasetid",
        token
      );
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
        replace_original: false,
        delete_original: false,
        text: message
      });
      done();
    },
    10000
  );

  it(
    "should send appropiate message to slack when project/dataset subscription already exists",
    async done => {
      const userid = "userid";
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "Subscription already exists in this channel. No further action required!";
      const isProject = true;

      Subscription.findOne = jest.fn(() => Promise.resolve({}));
      slack.sendResponse = jest.fn(() => Promise.resolve());
      dataworld.getDataset = jest.fn(() => Promise.resolve({ data: { isProject } }));
      dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(true));

      await commandService.handleDatasetorProjectSubscribeCommand(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(dataworld.getDataset).toHaveBeenCalledTimes(1);
      expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
        replace_original: false,
        delete_original: false,
        text: message
      });
      done();
    },
    10000
  );

  it("should send appropiate message to slack when dataset subscription fails", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe owner/datasetid";
    const responseUrl = "responseUrl";
    const token = "token";
    const isProject = false;

    dataworld.getDataset = jest.fn(() => Promise.resolve({ data: { isProject } }));
    dataworld.subscribeToDataset = jest.fn(() =>
      Promise.reject(new Error("Test - Failed DW dataset subscription"))
    );
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(false));

    await commandService.handleDatasetorProjectSubscribeCommand(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(dataworld.getDataset).toHaveBeenCalledTimes(1);
    expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      delete_original: false,
      text: "Failed to subscribe to *datasetid*. Please make sure to subscribe using a valid dataset or project URL."
    });

    done();
  });

  it("should subscribe to account", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe agentid";
    const responseUrl = "responseUrl";
    const token = "token";

    const message = "All set! You'll now receive notifications about *agentid* here.";
    const data = { message };

    Subscription.findOne = jest.fn(() => Promise.resolve());
    Subscription.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
    dataworld.subscribeToAccount = jest.fn(() => Promise.resolve({ data }));
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(false));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await commandService.handleAccountSubscribeCommand(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
    expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
    expect(dataworld.subscribeToAccount).toHaveBeenCalledWith("agentid", token);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      delete_original: false,
      text: message
    });
    done();
  });

  it("should send appropiate message to slack when account subscription already exists", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe agentid";
    const responseUrl = "responseUrl";
    const token = "token";

    const message = "Subscription already exists in this channel. No further action required!";

    Subscription.findOne = jest.fn(() => Promise.resolve({}));
    slack.sendResponse = jest.fn(() => Promise.resolve());
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(true));

    await commandService.handleAccountSubscribeCommand(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      delete_original: false,
      text: message
    });
    done();
  });

  it("should send appropiate message to slack when account subscription fails", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe agentid";
    const responseUrl = "responseUrl";
    const token = "token";

    Subscription.findOne = jest.fn(() =>
      Promise.reject(new Error("Test - Failed to get subscription form DB"))
    );
    slack.sendResponse = jest.fn(() => Promise.resolve());
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(true));

    await commandService.handleAccountSubscribeCommand(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      delete_original: false,
      text: "Failed to subscribe to *agentid*. Is that a valid data.world account ID?"
    });
    done();
  });

  it("should send appropiate message to slack when subscription is not present in channel", async done => {
    const channelid = "channelid";
    const cmd = "unsubscribe owner/datasetid";
    const responseUrl = "responseUrl";

    helper.getSubscriptionStatus = jest.fn(() => [false, false]);
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await commandService.handleDatasetOrProjectUnsubscribeCommand(
      channelid,
      cmd,
      responseUrl
    );

    expect(helper.getSubscriptionStatus).toHaveBeenCalledWith(
      "owner/datasetid",
      channelid     
    );
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      delete_original: false,
      text:
        `No subscription found for *owner/datasetid* here. Use \`/${process.env.SLASH_COMMAND} list\` to list all active subscriptions.`
    });
    done();
  });

  it(
    "should send appropiate message to slack when unsubscribeFromDatasetOrProject fails",
    async done => {
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const error = new Error("Test - error");
      const data = {
        replace_original: false,
        delete_original: false,
        text: "Failed to unsubscribe from *datasetid*."
      };

      slack.sendResponse = jest.fn(() => Promise.resolve());
      helper.getSubscriptionStatus = jest.fn(() => Promise.reject(error));

      await commandService.handleDatasetOrProjectUnsubscribeCommand(
        channelid,
        cmd,
        responseUrl,
      );

      expect(helper.getSubscriptionStatus).toHaveBeenCalledWith(
        "owner/datasetid",
        channelid,
      );

      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, data);

      done();
    },
    10000
  );

  it(
    "should unsubscribe from project",
    async done => {
      const channelId = "channelid";
      const owner = "owner";
      const id = "datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "No problem! You'll no longer receive notifications about *datasetid* here.";
      const data = { message };
      const slackData = {
        replace_original: false,
        delete_original: false,
        text: message
      };

      Subscription.destroy = jest.fn(() => Promise.resolve());
      helper.getSubscriptionStatus = jest.fn(() => Promise.resolve([true, true]));
      dataworld.unsubscribeFromProject = jest.fn(() =>
        Promise.resolve({ data })
      );
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await subscriptionService.unsubscribeFromProject(
        channelId,
        id,
        owner,
        responseUrl,
        token
      );
      expect(helper.getSubscriptionStatus).toHaveBeenCalledTimes(1);
      expect(Subscription.destroy).toHaveBeenCalledTimes(1);
      expect(dataworld.unsubscribeFromProject).toHaveBeenCalledTimes(1);
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, slackData);
      done();
    },
    10000
  );

  it(
    "should unsubscribe from account",
    async done => {
      const cmd = "subscribe agentid";
      const responseUrl = "responseUrl";
      const channelid = "channelid";
      const message = "No problem! You'll no longer receive notifications about *agentid* here.";
      const data = { message };
      const slackData = {
        replace_original: false,
        delete_original: false,
        text: message
      };
      const user = { dwAccessToken: "dwAccessToken" };
      const subscription = {  slackUserId: "slackUserId" };

      Subscription.findOne = jest.fn(() => Promise.resolve({ subscription }));
      User.findOne = jest.fn(() => Promise.resolve({ user }));
      Subscription.destroy = jest.fn(() => Promise.resolve());

      helper.getSubscriptionStatus = jest.fn(() => [true, true]);
      dataworld.unsubscribeFromAccount = jest.fn(() =>
        Promise.resolve({ data })
      );
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await commandService.handleUnsubscribeFromAccount(
        channelid,
        cmd,
        responseUrl,
      );
      expect(helper.getSubscriptionStatus).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(Subscription.destroy).toHaveBeenCalledTimes(1);
      expect(dataworld.unsubscribeFromAccount).toHaveBeenCalledTimes(1);
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, slackData);
      done();
    },
    10000
  );

  it("should list subscriptions", async done => {
    const body = {
      response_url: "response_url",
      channel_id: "channel_id",
      user_id: "user_id"
    };
    const req = { body };
    const message = `*Active Subscriptions*`;
    const dwAccessToken = "dwAccessToken";
    const options = [];
    
    options.push({
      "text": {
        "type": "plain_text",
        "text": "resourceId"
      },
      "value": "resourceId"
    });

    const blocks = [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Active Subscriptions*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `• https://${dwDomain}/resourceId \n *created by :* <@user_id> \n`
      }
    },
    {
      "type": "actions",
      "block_id": "subscription_list",
      "elements": [
        {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Unsubscribe from..."
          },
          "action_id": "unsubscribe_menu",
          "options": options,
          "confirm": {
            "title": {
              "type": "plain_text",
              "text": "Confirm"
            },
            "text": {
              "type": "mrkdwn",
              "text": "Are you sure you want to unsubscribe from selected resource ?"
            },
            "confirm": {
              "type": "plain_text",
              "text": "Yes"
            },
            "deny": {
              "type": "plain_text",
              "text": "No"
            }
          }
        }
      ]
    }]

    const subscription = {
      slackUserId: "user_id",
      resourceId: "resourceId"
    };
    const subscriptions = [subscription];

    const data = {
      text: message,
      blocks: blocks,
      replace_original: false,
      delete_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() => subscriptions);
    User.findOne = jest.fn(() => Promise.resolve({ dwAccessToken }));
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(true));

    await commandService.handleListSubscriptionCommand(
      req.body.response_url,
      req.body.channel_id,
      req.body.user_id
    );

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });

  it("should send appropiate message to slack when there's no subscription", async done => {
    const body = {
      response_url: "response_url",
      channel_id: "channel_id",
      user_id: "user_id"
    };
    const req = { body };
    const commandText = process.env.SLASH_COMMAND;
    const message = `No subscription found. Use \`\/${commandText} help\` to learn how to subscribe.`;
    const data = {
      text: message,
      replace_original: false,
      delete_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() => []);

    await commandService.handleListSubscriptionCommand(
      req.body.response_url,
      req.body.channel_id,
      req.body.user_id,
      false
    );

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });

  it("should send appropiate message to slack when list subscriptions command fails", async done => {
    const body = {
      response_url: "response_url",
      channel_id: "channel_id",
      user_id: "user_id"
    };
    const req = { body };
    const message = `Failed to get subscriptions.`;
    const data = {
      text: message,
      replace_original: false,
      delete_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() =>
      Promise.reject(new Error("Test error"))
    );

    await commandService.handleListSubscriptionCommand(
      req.body.response_url,
      req.body.channel_id,
      req.body.user_id,
      false
    );

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });

  it("should build and send help message to slack.", async done => {
    const commandText = process.env.SLASH_COMMAND;
    const message = `Not sure how to use \`/${commandText}\`? Here are some ideas:point_down:`;
    const blocks = [];
    const responseUrl = "response_url";

    const commandsInfo = [
      `Not sure how to use \`/${commandText}? Here are some ideas:point_down:`,
      `_Subscribe to a data.world dataset:_ \n \`/${commandText} subscribe dataset_url\``,
      `_Subscribe to a data.world project:_ \n \`/${commandText} subscribe project_url\``,
      `_Subscribe to a data.world account:_ \n \`/${commandText} subscribe account\``,
      `_Unsubscribe from a data.world dataset:_ \n \`/${commandText} unsubscribe dataset_url\``,
      `_Unsubscribe from a data.world project:_ \n \`/${commandText} unsubscribe project_url\``,
      `_Unsubscribe from a data.world account:_ \n \`/${commandText} unsubscribe account\``,
      `_List active subscriptions._ : \n \`/${commandText} list\``,
       //Note : This feature is disabled.
      `_Get a webhook URL for the current channel:_ \n \`/${commandText} webhook\``
    ];

    collection.forEach(commandsInfo, value => {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": value
        }
      });
    });

    const data = {
      text: message,
      blocks: blocks,
      replace_original: false,
      delete_original: false
    };

    await commandService.showHelp(responseUrl);

    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });
});
