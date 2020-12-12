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
const request = require("supertest");
const server = require("../../app");
const dataworld = require("../../api/dataworld");
const slack = require("../../api/slack");
const User = require("../../models").User;
const Subscription = require("../../models").Subscription;
const Team = require("../../models").Team;
const Channel = require("../../models").Channel;
const tokenHelpers = require("../../helpers/tokens");
const fixtures = require("../../jest/fixtures");

jest.mock("../../api/slack");
jest.mock("../../helpers/tokens");

beforeAll(() => {
  tokenHelpers.getBotAccessTokenForTeam.mockImplementation(() =>
    "botAccessToken"
  );
  tokenHelpers.getBotAccessTokenForChannel.mockImplementation(() =>
    "botAccessToken"
  );
})

describe("POST /api/v1/webhook/dw/events - Process DW webhook events", () => {
  const newDataset = {
    action: "create",
    entity: "dataset",
    actor: "User8",
    owner: "User8",
    dataset: "Cool pictures of dogs",
    links: {
      api: {
        actor: "https://api.data.world/v0/users/user8",
        owner: "https://api.data.world/v0/users/user8",
        dataset: "https://api.data.world/v0/datasets/user8/cool-dog-pics"
      },
      web: {
        actor: "https://data.world/user8",
        owner: "https://data.world/user8",
        dataset: "https://data.world/user8/cool-dog-pics"
      }
    },
    timestamp: "2017-10-24T17:36:23.533Z",
    subscriberid: "agent:user8",
    origin: "UI"
  };

  const newProject = {
    action: "create",
    entity: "dataset",
    actor: "User8",
    owner: "User8",
    project: "Cool pictures of dogs",
    links: {
      api: {
        actor: "https://api.data.world/v0/users/user8",
        owner: "https://api.data.world/v0/users/user8",
        project: "https://api.data.world/v0/projects/user8/cool-dog-pics"
      },
      web: {
        actor: "https://data.world/user8",
        owner: "https://data.world/user8",
        project: "https://data.world/user8/cool-dog-pics"
      }
    },
    timestamp: "2017-10-24T17:36:23.533Z",
    origin: "UI",
    subscriberid: "agent:user8"
  };

  const dwDataset = {
    owner: "User8",
    id: "cool-dog-pics",
    title: "TrumpWorld",
    description: "TrumpWorld Data",
    summary: "From the Buzzfeed article...",
    version: "versionId",
    tags: [
      "trump",
      "trump world",
      "president",
      "connections",
      "swamp",
      "business network"
    ],
    visibility: "OPEN",
    files: [
      {
        name: "org-org-connections.csv",
        sizeInBytes: 97658,
        source: {
          id: "bfbac3bb-9cec-410a-9ac4-c904a56d65fe",
          url:
            "https://raw.githubusercontent.com/BuzzFeedNews/trumpworld/master/data/org-org-connections.csv",
          syncStatus: "OK",
          lastSyncStart: "2017-02-06T22:55:15.242Z",
          lastSyncSuccess: "2017-02-06T22:55:15.258Z",
          lastSyncFailure: "2017-02-01T23:47:47.667Z"
        },
        created: "2017-02-01T23:45:12.379Z",
        updated: "2017-02-03T16:05:03.241Z"
      },
      {
        name: "person-org-connections.csv",
        sizeInBytes: 231637,
        source: {
          id: "91cf66e3-4bd7-422f-a8ec-7de1b68f8ee1",
          url:
            "https://raw.githubusercontent.com/BuzzFeedNews/trumpworld/master/data/person-org-connections.csv",
          syncStatus: "OK",
          lastSyncStart: "2017-02-06T22:55:15.242Z",
          lastSyncSuccess: "2017-02-06T22:55:15.310Z"
        },
        created: "2017-02-01T23:51:02.777Z",
        updated: "2017-02-03T16:05:03.241Z"
      },
      {
        name: "person-person-connections.csv",
        sizeInBytes: 32556,
        source: {
          id: "b1e0659b-c282-408a-893a-14b5e5a1ae4c",
          url:
            "https://raw.githubusercontent.com/BuzzFeedNews/trumpworld/master/data/person-person-connections.csv",
          syncStatus: "OK",
          lastSyncStart: "2017-02-06T22:55:15.242Z",
          lastSyncSuccess: "2017-02-06T22:55:15.361Z"
        },
        created: "2017-02-01T23:51:32.492Z",
        updated: "2017-02-03T16:05:03.241Z"
      }
    ],
    status: "LOADED",
    created: "2017-02-01T22:33:58.809Z",
    updated: "2017-02-06T22:55:19.128Z",
    isProject: false,
    accessLevel: "READ"
  };

  const dwProject = {
    accessLevel: "READ",
    created: "2017-08-08T18:40:27.270Z",
    files: [
      {
        created: "2017-08-09T17:11:11.225Z",
        description: "Cleaned up column headers and empty cells using Excel",
        labels: ["clean data"],
        name: "cleaned_USCG_data_import.xlsx",
        sizeInBytes: 42430,
        updated: "2017-08-09T17:11:11.225Z"
      },
      {
        created: "2017-08-09T16:44:02.861Z",
        description: "Data loaded using Tablua from...",
        labels: ["raw data"],
        name: "raw_USCG_data_import.csv",
        sizeInBytes: 3097,
        updated: "2017-08-09T16:44:02.861Z"
      },
      {
        created: "2017-08-09T16:51:55.176Z",
        name: "uscg-search-rescue-summary.ipynb",
        sizeInBytes: 26786,
        updated: "2018-03-27T23:27:46.167Z"
      }
    ],
    id: "cool-dog-pics",
    linkedDatasets: [
      {
        accessLevel: "READ",
        created: "2016-11-17T15:10:00.033Z",
        description: "USCG Search and Rescue Summary Statistics",
        id: "uscg-search-rescue-summary",
        license: "Public Domain",
        owner: "uscg",
        summary: "Datasets include statistics on search and...",
        tags: ["boat", "communication", "search and rescue sar"],
        title: "USCG Search Rescue Summary",
        updated: "2016-11-17T15:18:37.403Z",
        version: "7f38fbbb-55b3-4fde-bfa5-44ace690c835",
        visibility: "OPEN"
      }
    ],
    objective:
      "Link to a dataset, extract some data from a PDF, make some insights!",
    owner: "User8",
    status: "LOADED",
    version: "versionId",
    summary:
      "Overview\n-----------\nA sample project to show off the different kinds...\n\n",
    tags: ["new feature"],
    title: "An Example Project that Shows What To Put in data.world",
    updated: "2018-03-27T23:27:51.006Z",
    visibility: "OPEN"
  };

  it("Should handle DW new dataset event", done => {
    const data = dwDataset;
    const dwAccessToken = "dwAccessToken";
    const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";
    const teamId = "teamId";
    const dwAgentId = "user8";
    const dwResourceId = "cool-dog-pics";
    const channelId = "channelId";
    const subscription = {
      channelId: channelId,
      slackUserId: "slackUserId"
    };
    const subscriber = {
      slackId: "slackId",
      dwAccessToken
    };
    const actor = {
      slackId: "slackId"
    };
    const ownerResponse = {
      data: {}
    };
    const channel = {
      teamId
    };
    const team = {
      botAccessToken
    };

    const agent = request(server)
      .post("/api/v1/webhook/dw/events")
      .send(newDataset);

    const port = agent.app.address().port;
    const serverBaseUrl = `http://127.0.0.1:${port}`;

    const expectedAttachment = {
      fallback: "user8 created a new dataset",
      pretext: "<@slackId> created a *new dataset*",
      title: "TrumpWorld",
      title_link: "https://data.world/user8/cool-dog-pics",
      thumb_url: `${serverBaseUrl}/assets/avatar.png`,
      color: "#5CC0DE",
      text: "TrumpWorld Data",
      footer: "user8/cool-dog-pics",
      footer_icon: `${serverBaseUrl}/assets/dataset.png`,
      ts: 1508866583,
      mrkdwn_in: ["text", "pretext", "fields"],
      callback_id: "dataset_subscribe_button",
      actions: [
        {
          type: "button",
          text: "Explore :microscope:",
          url: "https://data.world/user8/cool-dog-pics/workspace"
        },
        {
          name: "subscribe",
          text: "Subscribe",
          style: "primary",
          type: "button",
          value: "user8/cool-dog-pics"
        }
      ],
      fields: [
        {
          title: "Files",
          value:
            "• <https://data.world/user8/cool-dog-pics/workspace/file?filename=org-org-connections.csv|org-org-connections.csv> _(95.4 kB)_\n• <https://data.world/user8/cool-dog-pics/workspace/file?filename=person-org-connections.csv|person-org-connections.csv> _(226.2 kB)_\n• <https://data.world/user8/cool-dog-pics/workspace/file?filename=person-person-connections.csv|person-person-connections.csv> _(31.8 kB)_\n",
          short: false
        },
        {
          value:
            "`trump` `trump world` `president` `connections` `swamp` `business network` ",
          short: false
        }
      ]
    };

    User.findOne = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(subscriber))
      .mockImplementationOnce(() => Promise.resolve(actor));
    Team.findOne = jest.fn(() => Promise.resolve(team));
    Channel.findOne = jest.fn(() => Promise.resolve(channel));
    Subscription.findAll = jest.fn(() => Promise.resolve([subscription]));
    dataworld.getDataset = jest.fn(() => Promise.resolve({ data }));
    dataworld.getDWUser = jest.fn(() => Promise.resolve(ownerResponse));

    slack.sendMessageWithAttachments = jest.fn();

    agent.expect(200).end((err, res) => {
      if (err) return done(err);
      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(Subscription.findAll).toHaveBeenCalledTimes(1);
      expect(dataworld.getDataset).toBeCalledWith(
        dwResourceId,
        dwAgentId,
        dwAccessToken
      );
      expect(dataworld.getDWUser).toBeCalledWith(dwAccessToken, dwAgentId);
      expect(Channel.findOne).toHaveBeenCalledTimes(1);
      expect(slack.sendMessageWithAttachments).toBeCalledWith(
        botAccessToken,
        channelId,
        [expectedAttachment]
      );
      done();
    });
  });

  it("Should handle DW new dataset event", done => {
    const data = dwProject;
    const dwAccessToken = "dwAccessToken";
    const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";
    const teamId = "teamId";
    const dwAgentId = "user8";
    const dwResourceId = "cool-dog-pics";
    const channelId = "channelId";
    const subscription = {
      channelId: channelId,
      slackUserId: "slackUserId"
    };
    const ownerResponse = {
      data: {}
    };
    const subscriber = {
      slackId: "slackId",
      dwAccessToken
    };
    const actor = {
      slackId: "slackId"
    };
    const channel = {
      teamId
    };
    const team = {
      botAccessToken
    };

    User.findOne = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(subscriber))
      .mockImplementationOnce(() => Promise.resolve(actor));
    Team.findOne = jest.fn(() => Promise.resolve(team));
    Channel.findOne = jest.fn(() => Promise.resolve(channel));
    Subscription.findAll = jest.fn(() => Promise.resolve([subscription]));

    dataworld.getDWUser = jest.fn(() => Promise.resolve(ownerResponse));
    dataworld.getProject = jest.fn(() => Promise.resolve({ data }));

    slack.sendMessageWithAttachments = jest.fn();

    request(server)
      .post("/api/v1/webhook/dw/events")
      .send(newProject)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
        expect(User.findOne).toHaveBeenCalledTimes(2);
        expect(Subscription.findAll).toHaveBeenCalledTimes(1);
        expect(dataworld.getProject).toBeCalledWith(
          dwResourceId,
          dwAgentId,
          dwAccessToken
        );
        expect(dataworld.getDWUser).toBeCalledWith(dwAccessToken, dwAgentId);
        // expect(Team.findOne).toHaveBeenCalledTimes(1);
        // expect(Channel.findOne).toHaveBeenCalledTimes(1);
        // expect(slack.sendMessageWithAttachments).toBeCalledWith(
        //   botAccessToken,
        //   channelId,
        //   [expectedAttachment]
        // );
      });
  });
});

describe("POST /api/v1/webhook/:webhookId", () => {
  const mockChannelId = "mockChannelId";

  it("Should send a slack message for an authorization request event", (done) => {
    const webhookBody = fixtures.authorizationRequestCreatedEventBody;
    Channel.findAll = jest.fn(() => [{ channelId: "mockChannelId" }]);

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
        expect(slack.sendMessageWithBlocks).toHaveBeenCalledWith(
          "botAccessToken",
          mockChannelId,
          expect.anything()
        );
        expect(slack.sendMessageWithBlocks.mock.calls).toMatchSnapshot();
      });
  });

  it("Should send a slack message for a contribution request event", (done) => {
    const webhookBody = fixtures.contributionRequestCreatedEventBody;
    Channel.findAll = jest.fn(() => [{ channelId: "mockChannelId" }]);

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
        expect(slack.sendMessageWithBlocks).toHaveBeenCalledWith(
          "botAccessToken",
          mockChannelId,
          expect.anything()
        );
        expect(slack.sendMessageWithBlocks.mock.calls).toMatchSnapshot();
      });
  });

  it("Should look for channels with the given webhook id route param", (done) => {
    const webhookBody = fixtures.contributionRequestCreatedEventBody;
    Channel.findAll = jest.fn(() => [{ channelId: "mockChannelId" }]);

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
        expect(Channel.findAll).toBeCalledWith({ 
          where: { webhookId: "mockWebhookId" }
        });
      });
  });

  it("Should send multiple slack messages if there are multiple channels", (done) => {
    const webhookBody = fixtures.authorizationRequestCreatedEventBody;
    const mockChannels = [
      { channelId: "mockChannel1" },
      { channelId: "mockChannel2" },
      { channelId: "mockChannel3" }
    ]
    Channel.findAll = jest.fn(() => mockChannels);

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
        for (let i = 1; i <= 3; i++) {
          expect(slack.sendMessageWithBlocks).toHaveBeenNthCalledWith(
            i,
            "botAccessToken",
            `mockChannel${i}`,
            expect.anything()
          );
        }
      });
  })

  it("Should return a 404 if the webhookId yields no corresponding channels", (done) => {
    const webhookBody = fixtures.contributionRequestCreatedEventBody;
    Channel.findAll = jest.fn(() => []);

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(404)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  })

  it("Should return a 400 if the eventType is not valid", (done) => {
    const webhookBody = fixtures.contributionRequestCreatedEventBody;
    Channel.findAll = jest.fn(() => [{ channelId: "mockChannelId" }]);

    webhookBody.eventType = "invalidEventType";

    request(server)
      .post("/api/v1/webhook/mockWebhookId")
      .send(webhookBody)
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  })
});
