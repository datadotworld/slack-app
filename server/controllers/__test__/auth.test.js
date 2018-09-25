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
const auth = require("../auth");
const dataworld = require("../../api/dataworld");
const slack = require("../../api/slack");
const User = require("../../models").User;
const Team = require("../../models").Team;

describe("Test Auth controller methods", () => {
  it("should check slack association status", async done => {
    const slackId = "slackId";
    const dwAccessToken = "dwAccessToken";

    User.findOne = jest.fn(() => Promise.resolve({ dwAccessToken }));
    dataworld.verifyDwToken = jest.fn(() => Promise.resolve(true));

    const [isAssociated, user] = await auth.checkSlackAssociationStatus(
      slackId
    );

    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(dataworld.verifyDwToken).toHaveBeenCalledWith(dwAccessToken);
    expect(isAssociated).toBeTruthy();
    expect(user).toEqual({ dwAccessToken });

    done();
  });

  it(
    "should begin slack association",
    async done => {
      const slackUserId = "slackUserId";
      const teamId = "teamId";
      const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";
      const dwAccessToken = "dwAccessToken";
      const user = { dwAccessToken };

      Team.findOne = jest.fn(() => Promise.resolve({ botAccessToken }));
      User.findOrCreate = jest.fn(() => Promise.resolve([user, false]));
      slack.sendAuthRequiredMessage = jest.fn(() => Promise.resolve());

      await auth.beginSlackAssociation(slackUserId, teamId);

      expect(Team.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOrCreate).toHaveBeenCalledTimes(1);
      expect(slack.sendAuthRequiredMessage).toHaveBeenCalledTimes(1);
      done();
    },
    10000
  );

  it(
    "should begin unfurl slack association",
    async done => {
      const userId = "userId";
      const channel = "channel";
      const teamId = "teamId";
      const nonce = "nonce";
      const accessToken = process.env.SLACK_TEAM_TOKEN || "accessToken";
      const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";

      const user = { nonce };

      Team.findOne = jest.fn(() => Promise.resolve({ accessToken, botAccessToken }));
      User.findOrCreate = jest.fn(() => Promise.resolve([user, false]));
      slack.startUnfurlAssociation = jest.fn(() => Promise.resolve());

      await auth.beginUnfurlSlackAssociation(
        userId,
        channel,
        teamId
      );

      expect(Team.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOrCreate).toHaveBeenCalledTimes(1);
      expect(slack.startUnfurlAssociation).toHaveBeenCalledTimes(1);

      done();
    },
    10000
  );
  // it('should refresh expired DW token', done => {});
});
