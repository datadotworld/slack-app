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
const slack = require("../../api/slack");
const dataworld = require("../../api/dataworld");
const server = require("../../app");

const AuthMessage = require("../../models").AuthMessage;
const User = require("../../models").User;
const Team = require("../../models").Team;

describe("GET /api/v1/auth/oauth - Complete slack app installation", () => {
  it("should handle error response from slack", async () => {
    const response = await request(server)
      .get("/api/v1/auth/oauth")
      .query({ error: "error" });

    expect(response.status).toEqual(302);
    expect(response.header.location).toEqual(
      expect.stringContaining("/failed")
    );
  });

  it("should create/update team, send welcome message to slack and deep link to slack", done => {
    //Test data
    const teamId = "Tmock";
    const userId = "userId";
    const botToken = "botToken";
    const code = "code";
    const update =  jest.fn(() => Promise.resolve());
    const team = { update , teamId, botAccessToken: botToken }
    const resp = {
      url: "https://slack.com/api/oauth.access",
      statusCode: 200,
      data: {
        access_token: "xoxp-XXXXXXXX-XXXXXXXX-XXXXX",
        scope: "incoming-webhook,commands,bot",
        team_name: "mockTeam",
        user_id: userId,
        team_id: teamId,
        bot: {
          bot_user_id: "Bmock",
          bot_access_token: botToken
        }
      }
    };

    slack.oauthAccess = jest.fn(() => Promise.resolve(resp));
    slack.sendWelcomeMessage = jest.fn(() => Promise.resolve());
    Team.findOrCreate = jest.fn(() => Promise.resolve([team, false]));

    request(server)
      .get("/api/v1/auth/oauth")
      .query({ code })
      .expect(302)
      .end((err, res) => {
        if (err) return done(err);

        expect(res.header.location).toEqual(
          `https://slack.com/app_redirect?app=${
            process.env.SLACK_APP_ID
          }&team=${teamId}`
        );
        expect(slack.oauthAccess).toBeCalledWith(code);
        expect(slack.sendWelcomeMessage).toHaveBeenCalledTimes(1);
        expect(Team.findOrCreate).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
        expect(slack.sendWelcomeMessage).toBeCalledWith(
          process.env.SLACK_BOT_TOKEN || botToken,
          userId
        );
        done();
      });
  });
});

describe("GET /api/v1/auth/exchange - Complete slack association", () => {
  it("should handle failed DW code exchange", done => {
    const code = "code";
    const state = "state";
    const resp = {
      error: "test error"
    };
    dataworld.exchangeAuthCode = jest.fn(() => Promise.resolve(resp));
    request(server)
      .get("/api/v1/auth/exchange")
      .query({ code, state })
      .expect(400)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.text).toEqual("failed");
        expect(dataworld.exchangeAuthCode).toHaveBeenCalledTimes(1);
        expect(dataworld.exchangeAuthCode).toBeCalledWith(code);
        done();
      });
  });

  it("should complete slack association successfully", done => {
    const code = "code";
    const state = "state";
    const teamId = "teamId";
    const channel = "channelId";
    const ts = "ts";
    const id = "dwUserId";
    const access_token = "access_token";
    const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";
    const slackId = "slackId";
    const destroy =    jest.fn(() => Promise.resolve());

    dataworld.exchangeAuthCode = jest.fn(() =>
      Promise.resolve({ data: { access_token } })
    );
    dataworld.getActiveDWUser = jest.fn(() =>
      Promise.resolve({ data: { id } })
    );
    slack.deleteSlackMessage = jest.fn(() => Promise.resolve());
    slack.sendCompletedAssociationMessage = jest.fn(() => Promise.resolve());

    const update = jest.fn(() => Promise.resolve({}));
    User.findOne = jest.fn(() => Promise.resolve({ teamId, slackId, update }));
    Team.findOne = jest.fn(() => Promise.resolve({ botAccessToken }));
    AuthMessage.findOne = jest.fn(() => Promise.resolve({ channel, ts, destroy }));

    request(server)
      .get("/api/v1/auth/exchange")
      .query({ code, state })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);

        expect(res.body.url).toEqual(
          `https://slack.com/app_redirect?app=${
            process.env.SLACK_APP_ID
          }&team=${teamId}`
        );
        expect(dataworld.exchangeAuthCode).toBeCalledWith(code);
        expect(dataworld.getActiveDWUser).toBeCalledWith(access_token);
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(AuthMessage.findOne).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
        expect(Team.findOne).toHaveBeenCalledTimes(1);
        expect(slack.deleteSlackMessage).toBeCalledWith(botAccessToken, channel, ts);
        expect(slack.sendCompletedAssociationMessage).toBeCalledWith(
          botAccessToken, slackId
        );

        done();
      });
  });
});
