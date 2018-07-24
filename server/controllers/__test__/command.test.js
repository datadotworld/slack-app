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
const collection = require("lodash/collection");
const dataworld = require("../../api/dataworld");
const helper = require("../../helpers/helper");
const slack = require("../../api/slack");
const command = require("../command");
const Subscription = require("../../models").Subscription;

describe("Test Auth controller methods", () => {
  it(
    "should subscribe to project",
    async done => {
      const userid = "userid";
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "Webhook subscription created successfully.";
      const data = { message };

      Subscription.findOne = jest.fn(() => Promise.resolve());
      Subscription.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
      dataworld.subscribeToProject = jest.fn(() => Promise.resolve({ data }));
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await command.subscribeToProjectOrDataset(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
      expect(dataworld.subscribeToProject).toHaveBeenCalledWith(
        "owner",
        "datasetid",
        token
      );
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
        replace_original: false,
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
      const message = "Subscription already exists in this channel.";

      Subscription.findOne = jest.fn(() => Promise.resolve({}));
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await command.subscribeToProjectOrDataset(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
        replace_original: false,
        text: message
      });
      done();
    },
    10000
  );

  it(
    "should subscribe to dataset if project subscription fails.",
    async done => {
      const userid = "userid";
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "Webhook subscription created successfully.";
      const data = { message };

      Subscription.findOne = jest.fn(() => Promise.resolve());
      dataworld.subscribeToProject = jest.fn(() =>
        Promise.reject(new Error("Test - Failed DW project subscription"))
      );
      Subscription.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
      dataworld.subscribeToDataset = jest.fn(() => Promise.resolve({ data }));
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await command.subscribeToProjectOrDataset(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
      expect(dataworld.subscribeToProject).toHaveBeenCalledWith(
        "owner",
        "datasetid",
        token
      );
      expect(dataworld.subscribeToDataset).toHaveBeenCalledWith(
        "owner",
        "datasetid",
        token
      );
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
        replace_original: false,
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

    dataworld.subscribeToDataset = jest.fn(() =>
      Promise.reject(new Error("Test - Failed DW dataset subscription"))
    );

    await command.subscribeToDataset(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      text: "Failed to subscribe to dataset : datasetid"
    });

    done();
  });

  it("should subscribe to account", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe agentid";
    const responseUrl = "responseUrl";
    const token = "token";

    const message = "Webhook subscription created successfully.";
    const data = { message };

    Subscription.findOne = jest.fn(() => Promise.resolve());
    Subscription.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
    dataworld.subscribeToAccount = jest.fn(() => Promise.resolve({ data }));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.subscribeToAccount(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
    expect(dataworld.subscribeToAccount).toHaveBeenCalledWith("agentid", token);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
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

    const message = "Subscription already exists in this channel.";

    Subscription.findOne = jest.fn(() => Promise.resolve({}));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.subscribeToAccount(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
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

    await command.subscribeToAccount(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(Subscription.findOne).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      text: "Failed to subscribe to : agentid"
    });
    done();
  });

  it("should send appropiate message to slack when subscription is not present in channel", async done => {
    const userid = "userid";
    const channelid = "channelid";
    const cmd = "subscribe owner/datasetid";
    const responseUrl = "responseUrl";
    const token = "token";

    helper.getSubscriptionStatus = jest.fn(() => [ false, false ]);
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.unsubscribeFromDatasetOrProject(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(helper.getSubscriptionStatus).toBeCalledWith(
      "owner/datasetid",
      channelid,
      userid
    );
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, {
      replace_original: false,
      text:
        "Specified subscription `owner/datasetid` not found in this channel."
    });
    done();
  });

  it(
    "should send appropiate message to slack when unsubscribeFromDatasetOrProject fails",
    async done => {
      const userid = "userid";
      const channelid = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const error = new Error("Test - error");
      const data = {
        replace_original: false,
        text: "Failed to unsubscribe from : datasetid"
      };

      slack.sendResponse = jest.fn(() => Promise.resolve());
      helper.getSubscriptionStatus = jest.fn(() => Promise.reject(error));
      dataworld.unsubscribeFromProject = jest.fn(() => Promise.reject(error));

      await command.unsubscribeFromDatasetOrProject(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(helper.getSubscriptionStatus).toBeCalledWith(
        "owner/datasetid",
        channelid,
        userid
      );
      expect(dataworld.unsubscribeFromProject).toBeCalledWith(
        "owner",
        "datasetid",
        token
      );
      expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, data);

      done();
    },
    10000
  );

  it(
    "should unsubscribe from project",
    async done => {
      const userid = "userid";
      const channelId = "channelid";
      const cmd = "subscribe owner/datasetid";
      const responseUrl = "responseUrl";
      const token = "token";
      const message = "Webhook subscription deleted successfully.";
      const data = { message };
      const slackData = {
        replace_original: false,
        text: message
      };

      Subscription.destroy = jest.fn(() => Promise.resolve());
      dataworld.unsubscribeFromProject = jest.fn(() =>
        Promise.resolve({ data })
      );
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await command.unsubscribeFromProject(channelId, userid, cmd, responseUrl, token);

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
      const userid = "userid";
      const cmd = "subscribe agentid";
      const responseUrl = "responseUrl";
      const channelid = "channelid";
      const token = "token";
      const message = "Webhook subscription deleted successfully.";
      const data = { message };
      const slackData = {
        replace_original: false,
        text: message
      };

      Subscription.destroy = jest.fn(() => Promise.resolve());
      helper.getSubscriptionStatus = jest.fn(() => [ true, true]);
      dataworld.unsubscribeFromAccount = jest.fn(() =>
        Promise.resolve({ data })
      );
      slack.sendResponse = jest.fn(() => Promise.resolve());

      await command.unsubscribeFromAccount(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

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

    const options = [];
    options.push({
      text: "resourceId",
      value: "resourceId"
    });
    const message = `*Active Subscriptions*`;

    const attachments = [
      {
        color: "#79B8FB",
        text: `• https://data.world/resourceId \n *created by :* <@user_id> \n`,
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

    const subscription = {
      slackUserId: "user_id",
      resourceId: "resourceId"
    };
    const subscriptions = [subscription];

    const data = {
      text: message,
      attachments: attachments,
      replace_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() => subscriptions);

    await command.listSubscription(req.body.response_url, req.body.channel_id, req.body.user_id, false);

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
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
    const message = `No subscription found. Use \`\/${commandText} help\` to see how to subscribe.`;
    const data = {
      text: message,
      replace_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() => []);

    await command.listSubscription(req.body.response_url, req.body.channel_id, req.body.user_id, false);

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
      replace_original: false
    };

    slack.sendResponse = jest.fn(() => Promise.resolve());
    Subscription.findAll = jest.fn(() =>
      Promise.reject(new Error("Test error"))
    );

    await command.listSubscription(req.body.response_url, req.body.channel_id, req.body.user_id, false);

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });

  it("should build and send help message to slack.", async done => {
    const message = `*Commands*`;
    const attachments = [];
    const responseUrl = "response_url";
    const commandText = process.env.SLASH_COMMAND;

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

    const data = {
      text: message,
      attachments: attachments,
      replace_original: false
    };

    await command.showHelp(responseUrl)

    expect(slack.sendResponse).toHaveBeenCalledWith("response_url", data);

    done();
  });
});
