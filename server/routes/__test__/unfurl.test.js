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
const auth = require("../../controllers/auth");
const dataworld = require("../../api/dataworld");
const slack = require("../../api/slack");
const Channel = require("../../models").Channel;
const Team = require("../../models").Team;
const Subscription = require("../../models").Subscription;

describe("POST /api/v1/unfurl/action - Process unfurl requests", () => {
  const linkSharedEvent = {
    token: process.env.SLACK_VERIFICATION_TOKEN,
    team_id: "teamId",
    api_app_id: "appId",
    event: {
      type: "link_shared",
      user: "userId",
      channel: "GBRPJRPDH",
      message_ts: "1532076310.000245",
      links: [
        { url: "https://data.world/kehesjay/actors-proj", domain: "data.world" }
      ]
    },
    type: "event_callback",
    event_id: "EvBTE3QKJM",
    event_time: 1532076311,
    authed_users: ["authedUserId"]
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
    id: "an-example-project-that-shows-what-to-put-in-data-world",
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
    owner: "jonloyens",
    status: "LOADED",
    version: "versionId",
    summary:
      "Overview\n-----------\nA sample project to show off the different kinds...\n\n",
    tags: ["new feature"],
    title: "An Example Project that Shows What To Put in data.world",
    updated: "2018-03-27T23:27:51.006Z",
    visibility: "OPEN"
  };

  const dwDataset = {
    owner: "sya",
    id: "trumpworld",
    title: "TrumpWorld",
    description: "TrumpWorld Data",
    summary:
      "From the Buzzfeed article [Help Us Map TrumpWorld](https://www.buzzfeed.com/johntemplon/help-us-map-trumpworld)\n>No American president has taken office with a giant network of businesses, investments, and corporate connections like that amassed by Donald J. Trump. His family and advisers have touched a staggering number of ventures, from a hotel in Azerbaijan to a poker company in Las Vegas.\n\n\nCheck out the data.world docs on how to Upload & sync files from [**Google Sheets**](https://docs.data.world/documentation/api/googleSync.html) and [**Github**](https://docs.data.world/documentation/api/githubSync.html)   \n\n\nSource: [github.com/BuzzFeedNews](https://github.com/BuzzFeedNews/trumpworld/tree/master/data)   \n\n_If you have suggestions for expanding or improving the dataset, please email trump@buzzfeed.com. If you’d like to send your tip securely and anonymously, see these [instructions](https://tips.buzzfeed.com/)._",
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

  it("Should handle project unfurling", done => {
    const event = linkSharedEvent.event;
    const isAssociated = true;
    const dwAccessToken = "dwAccessToken";
    const user = { dwAccessToken };
    const accessToken = process.env.SLACK_TEAM_TOKEN || "accessToken";
    const team = { accessToken };
    const dwAgentId = "kehesjay";
    const dwResourceId = "actors-proj";
    const data = {
      isProject: true
    };
    const ownerResponse = {
      data: {}
    };

    auth.checkSlackAssociationStatus = jest.fn(() =>
      Promise.resolve([isAssociated, user])
    );
    Team.findOne = jest.fn(() => Promise.resolve(team));
    dataworld.getDataset = jest.fn(() => Promise.resolve({ data }));
    Subscription.findOne = jest.fn(() => Promise.resolve());
    dataworld.getDWUser = jest.fn(() => Promise.resolve(ownerResponse));
    dataworld.getProject = jest.fn(() => Promise.resolve({ data: dwProject }));
    slack.sendUnfurlAttachments = jest.fn();

    const agent = request(server)
      .post("/api/v1/unfurl/action")
      .send(linkSharedEvent);

    const port = agent.app.address().port;
    const serverBaseUrl = `http://127.0.0.1:${port}`;

    const expectedAttachment = {
      fallback: "An Example Project that Shows What To Put in data.world",
      color: "#F6BD68",
      title: "An Example Project that Shows What To Put in data.world",
      title_link: "https://data.world/kehesjay/actors-proj",
      text:
        "Link to a dataset, extract some data from a PDF, make some insights!",
      footer: "kehesjay/actors-proj",
      footer_icon: `${serverBaseUrl}/assets/project.png`,
      thumb_url: `${serverBaseUrl}/assets/avatar.png`,
      ts: 1522193271,
      mrkdwn_in: ["fields"],
      callback_id: "dataset_subscribe_button",
      actions: [
        {
          type: "button",
          text: "Explore :microscope:",
          url: "https://data.world/kehesjay/actors-proj/workspace"
        },
        {
          name: "subscribe",
          text: "Subscribe :nerd_face:",
          style: "primary",
          type: "button",
          value: "kehesjay/actors-proj"
        }
      ],
      fields: [
        { value: "`new feature` ", short: false },
        {
          title: "Linked dataset",
          value:
            "• <https://data.world/kehesjay/actors-proj/workspace/dataset?datasetid=uscg-search-rescue-summary|USCG Search and Rescue Summary Statistics>\n",
          short: false
        }
      ]
    };

    const expectedUnfurlObject = {
      "https://data.world/kehesjay/actors-proj": expectedAttachment
    };

    agent.expect(200).end((err, res) => {
      if (err) return done(err);
      expect(auth.checkSlackAssociationStatus).toBeCalledWith(event.user);
      expect(Team.findOne).toHaveBeenCalledTimes(1);
      expect(dataworld.getDataset).toBeCalledWith(
        dwResourceId,
        dwAgentId,
        dwAccessToken
      );
      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(dataworld.getDWUser).toBeCalledWith(dwAccessToken, dwAgentId);
      expect(dataworld.getProject).toBeCalledWith(
        dwResourceId,
        dwAgentId,
        dwAccessToken
      );
      expect(slack.sendUnfurlAttachments).toBeCalledWith(
        event.message_ts,
        event.channel,
        expectedUnfurlObject,
        accessToken
      );
      done();
    });
  });

  it("Should handle dataset unfurling", done => {
    const event = linkSharedEvent.event;
    const isAssociated = true;
    const dwAccessToken = "dwAccessToken";
    const user = { dwAccessToken };
    const accessToken = process.env.SLACK_TEAM_TOKEN || "accessToken";
    const team = { accessToken };
    const dwAgentId = "kehesjay";
    const dwResourceId = "actors-proj";
    const data = dwDataset;
    const ownerResponse = {
      data: {}
    };

    auth.checkSlackAssociationStatus = jest.fn(() =>
      Promise.resolve([isAssociated, user])
    );
    Team.findOne = jest.fn(() => Promise.resolve(team));
    dataworld.getDataset = jest.fn(() => Promise.resolve({ data }));
    Subscription.findOne = jest.fn(() => Promise.resolve());
    dataworld.getDWUser = jest.fn(() => Promise.resolve(ownerResponse));
    slack.sendUnfurlAttachments = jest.fn();

    const agent = request(server)
      .post("/api/v1/unfurl/action")
      .send(linkSharedEvent);

    const port = agent.app.address().port;
    const serverBaseUrl = `http://127.0.0.1:${port}`;

    const expectedAttachment = {
      fallback: "TrumpWorld",
      color: "#5CC0DE",
      title: "TrumpWorld",
      title_link: "https://data.world/kehesjay/actors-proj",
      text: "TrumpWorld Data",
      thumb_url: `${serverBaseUrl}/assets/avatar.png`,
      footer: "kehesjay/actors-proj",
      footer_icon: `${serverBaseUrl}/assets/dataset.png`,
      ts: 1486421719,
      callback_id: "dataset_subscribe_button",
      mrkdwn_in: ["fields"],
      actions: [
        {
          type: "button",
          text: "Explore :microscope:",
          url: "https://data.world/kehesjay/actors-proj/workspace"
        },
        {
          name: "subscribe",
          text: "Subscribe :nerd_face:",
          style: "primary",
          type: "button",
          value: "kehesjay/actors-proj"
        }
      ],
      fields: [
        {
          value:
            "`trump` `trump world` `president` `connections` `swamp` `business network` ",
          short: false
        },
        {
          title: "Files",
          value:
            "• <https://data.world/kehesjay/actors-proj/workspace/file?filename=org-org-connections.csv|org-org-connections.csv> _(95.4 kB)_ \n• <https://data.world/kehesjay/actors-proj/workspace/file?filename=person-org-connections.csv|person-org-connections.csv> _(226.2 kB)_ \n• <https://data.world/kehesjay/actors-proj/workspace/file?filename=person-person-connections.csv|person-person-connections.csv> _(31.8 kB)_ \n",
          short: false
        }
      ]
    };

    const expectedUnfurlObject = {
      "https://data.world/kehesjay/actors-proj": expectedAttachment
    };

    agent.expect(200).end((err, res) => {
      if (err) return done(err);
      expect(auth.checkSlackAssociationStatus).toBeCalledWith(event.user);
      expect(Team.findOne).toHaveBeenCalledTimes(1);
      expect(dataworld.getDataset).toBeCalledWith(
        dwResourceId,
        dwAgentId,
        dwAccessToken
      );
      expect(Subscription.findOne).toHaveBeenCalledTimes(1);
      expect(dataworld.getDWUser).toBeCalledWith(dwAccessToken, dwAgentId);
      expect(slack.sendUnfurlAttachments).toBeCalledWith(
        event.message_ts,
        event.channel,
        expectedUnfurlObject,
        accessToken
      );
      done();
    });
  });
});

describe("POST /api/v1/unfurl/action - Process member joined channel event", () => {
  const joinedChannelEvent = {
    token: process.env.SLACK_VERIFICATION_TOKEN,
    team_id: "teamId",
    api_app_id: "appId",
    event: {
      type: "member_joined_channel",
      user: "userId",
      channel: "channelId",
      channel_type: "C",
      team: "teamId",
      inviter: "inviterId",
      event_ts: "1532076760.000057"
    },
    type: "event_callback",
    event_id: "EvBT9JP1RN",
    event_time: 1532076760,
    authed_users: ["authedUserID"]
  };
  it("Should handle project unfurling", done => {
    Channel.findOrCreate = jest.fn(() => [{}, true]);
    request(server)
      .post("/api/v1/unfurl/action")
      .send(joinedChannelEvent)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(Channel.findOrCreate).toHaveBeenCalledTimes(1);
        done();
      });
  });
});
