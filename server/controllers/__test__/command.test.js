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

    helper.belongsToChannelAndUser = jest.fn(() => Promise.resolve(false));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.unsubscribeFromDatasetOrProject(
      userid,
      channelid,
      cmd,
      responseUrl,
      token
    );

    expect(helper.belongsToChannelAndUser).toBeCalledWith(
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
      helper.belongsToChannelAndUser = jest.fn(() => Promise.reject(error));
      dataworld.unsubscribeFromProject = jest.fn(() => Promise.reject(error));

      await command.unsubscribeFromDatasetOrProject(
        userid,
        channelid,
        cmd,
        responseUrl,
        token
      );

      expect(helper.belongsToChannelAndUser).toBeCalledWith(
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

  it("should unsubscribe from project", async done => {
    const userid = "userid";
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
    dataworld.unsubscribeFromProject = jest.fn(() => Promise.resolve({ data }));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.unsubscribeFromProject(userid, cmd, responseUrl, token);

    expect(Subscription.destroy).toHaveBeenCalledTimes(1);
    expect(dataworld.unsubscribeFromProject).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, slackData);
    done();
  }, 10000);

  it("should unsubscribe from account", async done => {
    const userid = "userid";
    const cmd = "subscribe agentid";
    const responseUrl = "responseUrl";
    const channelid = "channelid";
    const token = "token";
    const message = "Webhook subscription deleted successfully.";
    const data = { message };
    const slackData = {
      replace_original: true,
      text: message
    };

    Subscription.destroy = jest.fn(() => Promise.resolve());
    helper.belongsToChannelAndUser = jest.fn(() => Promise.resolve(true));
    dataworld.unsubscribeFromAccount = jest.fn(() => Promise.resolve({ data }));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    await command.unsubscribeFromAccount(userid, channelid, cmd, responseUrl, token);

    expect(Subscription.destroy).toHaveBeenCalledTimes(1);
    expect(dataworld.unsubscribeFromAccount).toHaveBeenCalledTimes(1);
    expect(slack.sendResponse).toHaveBeenCalledWith(responseUrl, slackData);
    done();
  }, 10000);
});
