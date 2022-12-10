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
const helper = require("../../helpers/helper");
const fixtures = require("../../jest/fixtures");

const Team = require("../../models").Team;
const Channel = require("../../models").Channel;
const Subscription = require("../../models").Subscription;

const dwDomain = helper.DW_DOMAIN;

describe("POST /api/v1/command/ - Process slash command", () => {
  it("should respond to slack challenge request", done => {
    const challenge = "challenge";
    auth.verifySlackRequest = jest.fn(() => true);
    request(server)
      .post("/api/v1/command/")
      .send({ challenge })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body.challenge).toEqual(challenge);
        done();
      });
  });

  it("should handle slack ssl check properly", done => {
    const token = process.env.SLACK_VERIFICATION_TOKEN;
    const ssl_check = "ssl_check";
    auth.verifySlackRequest = jest.fn(() => true);
    request(server)
      .post("/api/v1/command/")
      .send({ ssl_check, token })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });
});

describe("POST /api/v1/command/action - Process an action", () => {
  const menu_action_payload = `{
    \"type\": \"block_actions\",
    \"user\": {
      \"id\": \"U03M7594GTT\",
      \"username\": \"dwslacktest\",
      \"name\": \"dwslacktest\",
      \"team_id\": \"T03LUDRTG3V\"
    },
    \"api_app_id\": \"A042EJVBFB6\",
    \"token\": \"wR3FggQmBpAcrywHrwTrx59a\",
    \"container\": {
      \"type\": \"message\",
      \"message_ts\": \"1663729514.001000\",
      \"channel_id\": \"C03LDTMQG23\",
      \"is_ephemeral\": \"true\"
    },
    \"trigger_id\": \"4112714566084.3708467934131.1d103a241c81092538bed404e2c63212\",
    \"team\": { \"id\": \"T03LUDRTG3V\", \"domain\": \"dwslacktest\" },
    \"enterprise\": \"null\",
    \"is_enterprise_install\": \"false\",
    \"channel\": { \"id\": \"C03LDTMQG23\", \"name\": \"dwslackapp\" },
    \"state\": { \"values\": { \"subscription_list\": \"[Object]\" } },
    \"response_url\": \"https://hooks.slack.com/actions/T03LUDRTG3V/4107305713189/RAa8f6zHZ1ZGkk0862hECt6S\",
    \"actions\": [
      {
        \"confirm\":  {
          \"title\": { \"type\": \"plain_text\", \"text\": \"Confirm\", \"emoji\": \"true\" },
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"Are you sure you want to unsubscribe from selected resource ?\",
            \"verbatim\": \"false\"
          },
          \"confirm\": { \"type\": \"plain_text\", \"text\": \"Yes\", \"emoji\": \"true\" },
          \"deny\": { \"type\": \"plain_text\", \"text\": \"No\", \"emoji\": \"true\" }
        },
        \"type\": \"static_select\",
        \"action_id\": \"unsubscribe_menu\",
        \"block_id\": \"subscription_list\",
        \"selected_option\": {
          \"text\": {
            \"type\": \"plain_text\",
            \"text\": \"dwslacktest/basketball-stats\",
            \"emoji\": \"true\"
          },
          \"value\": \"dwslacktest/basketball-stats\"
        },
        \"placeholder\": { \"type\": \"plain_text\", \"text\": \"Unsubscribe from...\", \"emoji\": \"true\" },
        \"action_ts\": \"1663729544.210697\"
      }
    ]
  }`

  const button_action_payload = `{
    \"type\": \"block_actions\",
    \"user\": {
      \"id\": \"U03M7594GTT\",
      \"username\": \"dwslacktest\",
      \"name\": \"dwslacktest\",
      \"team_id\": \"T03LUDRTG3V\"
    },
    \"api_app_id\": \"A042EJVBFB6\",
    \"token\": \"wR3FggQmBpAcrywHrwTrx59a\",
    \"container\": {
      \"type\": \"message_attachment\",
      \"message_ts\": \"1663729379.208379\",
      \"attachment_id\": \"1\",
      \"channel_id\": \"C03LDTMQG23\",
      \"is_ephemeral\": \"false\",
      \"is_app_unfurl\": \"true\",
      \"app_unfurl_url\": \"https:\\\/\\\/${dwDomain}\\\/dwslacktest/basketball-stats\"
    },
    \"trigger_id\": \"4103647075574.3708467934131.fe9571f3f336211dd116b857cc06c22b\",
    \"team\": { \"id\": \"T03LUDRTG3V\", \"domain\": \"dwslacktest\" },
    \"enterprise\": \"null\",
    \"is_enterprise_install\": \"false\",
    \"channel\": { \"id\": \"C03LDTMQG23\", \"name\": \"dwslackapp\" },
    \"app_unfurl\": {
      \"id\": \"1\",
      \"blocks\": [
        {
          \"type\": \"section\",
          \"block_id\": \"JIQy\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"<https:\\\/\\\/${dwDomain}\\\/dwslacktest/basketball-stats|basketball-stats>\\\\n\",
            \"verbatim\": \"false\"
          },
          \"accessory\": {
            \"type\": \"image\",
            \"image_url\": \"https://cdn.filepicker.io/api/file/YB2O14XWSJ2X0AMXHJLf\",
            \"alt_text\": \"avatar\"
          }
        },
        {
          \"type\": \"context\",
          \"block_id\": \"CWca\",
          \"elements\": [
            {
              \"type\": \"image\",
              \"image_url\": \"https://cdn.filepicker.io/api/file/YB2O14XWSJ2X0AMXHJLf\",
              \"alt_text\": \"dataset\"
            },
            {
              \"type\": \"mrkdwn\",
              \"text\": \"<!date^1531955022^dwslacktest/basketball-stats  {date_short_pretty} at {time}|dwslacktest/basketball-stats>\"
            }
          ]
        },
        {
          \"type\": \"actions\",
          \"block_id\": \"J0W\",
          \"elements\": [
            {
              \"type\": \"button\",
              \"text\": {
                \"type\": \"plain_text\",
                \"text\": \"Explore :microscope:\"
              },
              \"url\": \"https:\\\/\\\/${dwDomain}\\\/dwslacktest/basketball-stats/workspace\"
            },
            {
              \"type\": \"button\",
              \"action_id\": \"dataset_subscribe_button\",
              \"style\": \"primary\",
              \"text\": {
                \"type\": \"plain_text\",
                \"text\": \"Subscribe\"
              },
              \"value\": \"dwslacktest/basketball-stats\"
            }
          ]
        }
      ],
      \"fallback\": \"[no preview available]\",
      \"bot_id\": \"B042C3DU8RZ\",
      \"app_unfurl_url\": \"https:\\\/\\\/${dwDomain}\\\/dwslacktest/basketball-stats\",
      \"is_app_unfurl\": \"true\",
      \"app_id\": \"A042EJVBFB6\"
    },
    \"state\": { \"values\": {} },
    \"response_url\": \"https://hooks.slack.com/actions/T03LUDRTG3V/4110167256019/6kjH1Xm5leOHkTN6JdzJVsLs\",
    \"actions\": [
      {
        \"action_id\": \"dataset_subscribe_button\",
        \"block_id\": \"HFVZf\",
        \"text\":  { \"type\": \"plain_text\", \"text\": \"Subscribe\", \"emoji\": \"true\" },
        \"value\": \"dwslacktest/basketball-stats\",
        \"style\": \"primary\",
        \"type\": \"button\",
        \"action_ts\": \"1663729406.461872\"
      }
    ]
  }`;

  it("should pass slack ssl_check", done => {
    request(server)
      .post("/api/v1/command/action")
      .send({ ssl_check: true })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });

  it("should perform dataset unsubscribe menu action for associated user in know channel", done => {
    const payloadObject = JSON.parse(menu_action_payload);
    const action = payloadObject.actions[0];
    const resourceId = action.selected_option.value;
    const data = resourceId.split("/");
    const dwDatasetId = data.pop();
    const teamId = "teamId";
    const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";

    const isAssociated = true;
    const dwAccessToken = "dwAccessToken";
    const user = { dwAccessToken };
    const message = `No problem! You'll no longer receive notifications about *${dwDatasetId}* here.`;
    const response = { data: { message } };

    Team.findOne = jest.fn(() => Promise.resolve({ teamId, botAccessToken }));
    Channel.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
    Subscription.destroy = jest.fn(() => Promise.resolve());
    auth.checkSlackAssociationStatus = jest.fn(() =>
      Promise.resolve([isAssociated, user])
    );
    helper.getSubscriptionStatus = jest.fn(() => Promise.resolve([true, true]));
    dataworld.unsubscribeFromDataset = jest.fn(() => Promise.resolve(response));
    slack.botBelongsToChannel = jest.fn(() => Promise.resolve(true));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    request(server)
      .post("/api/v1/command/action")
      .send({ payload: menu_action_payload })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(slack.botBelongsToChannel).toBeCalledWith(
          payloadObject.channel.id,
          botAccessToken
        );
        expect(Team.findOne).toHaveBeenCalledTimes(2);
        expect(Channel.findOrCreate).toHaveBeenCalledTimes(1);
        expect(Subscription.destroy).toHaveBeenCalledTimes(1);
        expect(auth.checkSlackAssociationStatus).toBeCalledWith(
          payloadObject.user.id
        );
        expect(helper.getSubscriptionStatus).toBeCalledWith(
          resourceId,
          payloadObject.channel.id,
          payloadObject.user.id
        );
        const parts = resourceId.split("/");
        expect(dataworld.unsubscribeFromDataset).toBeCalledWith(
          parts.shift(),
          parts.shift(),
          dwAccessToken
        );
        expect(slack.sendResponse).toBeCalledWith(payloadObject.response_url, {
          replace_original: false,
          delete_original: false,
          text: message
        });
        done();
      });
  });

  // it("should perform project unsubscribe menu action for associated user in know channel", done => {});

  // it("should perform account unsubscribe menu action for associated user in know channel", done => {});

  // it("should not perform interactive action from unknown channels", done => {});

  // it("should not perform interactive action from unassociated users", done => {});

  // it("should not perform interactive action from unassociated users", done => {});

  it("should subscribe to project using button action", async done => {
    const payloadObject = JSON.parse(button_action_payload);
    const action = payloadObject.actions[0];
    const resourceId = action.value;
    const teamId = "teamId";
    const botAccessToken = process.env.SLACK_BOT_TOKEN || "botAccessToken";

    const isAssociated = true;
    const isProject = true;
    const dwAccessToken = "dwAccessToken";
    const user = { dwAccessToken };
    const parts = resourceId.split("/");
    const owner = parts.shift();
    const id = parts.shift();
    const message = `All set! You'll now receive notifications about *${id}* here.`;
    const response = { data: { message } };

    Team.findOne = jest.fn(() => Promise.resolve({ teamId, botAccessToken }));
    Channel.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
    auth.checkSlackAssociationStatus = jest.fn(() =>
      Promise.resolve([isAssociated, user])
    );
    Subscription.findOne = jest.fn(() => Promise.resolve());
    Subscription.findOrCreate = jest.fn(() => [{}, true]);
    dataworld.getDataset = jest.fn(() => Promise.resolve({ data: { isProject } }))
    dataworld.subscribeToProject = jest.fn(() => Promise.resolve(response));
    dataworld.verifySubscriptionExists = jest.fn(() => Promise.resolve(false));
    slack.botBelongsToChannel = jest.fn(() => Promise.resolve(true));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    request(server)
      .post("/api/v1/command/action")
      .send({ payload: button_action_payload })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(Team.findOne).toHaveBeenCalledTimes(2);
        expect(Channel.findOrCreate).toHaveBeenCalledTimes(1);
        expect(slack.botBelongsToChannel).toBeCalledWith(
          payloadObject.channel.id,
          botAccessToken
        );
        expect(auth.checkSlackAssociationStatus).toBeCalledWith(
          payloadObject.user.id
        );
        expect(Subscription.findOne).toHaveBeenCalledTimes(1);
        expect(Subscription.findOrCreate).toHaveBeenCalledTimes(1);
        expect(dataworld.getDataset).toHaveBeenCalledTimes(1);
        expect(dataworld.verifySubscriptionExists).toHaveBeenCalledTimes(1);
        expect(dataworld.subscribeToProject).toBeCalledWith(
          owner,
          id,
          dwAccessToken
        );
        expect(slack.sendResponse).toBeCalledWith(
          payloadObject.response_url,
          {
            delete_original: false,
            replace_original: false,
            text: message
          }
        );
        done();
      });
  });

  describe('dataset request action button', () => {
    let datasetRequestActionPayload, requestid, agentid, datasetid, dwAccessToken, botAccessToken

    beforeEach(() => {
      datasetRequestActionPayload = fixtures.datasetRequestRejectedActionPayload;
      const values = JSON.parse(datasetRequestActionPayload.actions[0].value);

      requestid = values.requestid
      agentid = values.agentid
      datasetid = values.datasetid
      dwAccessToken = "dwAccessToken";
      botAccessToken = "botAccessToken";

      Team.findOne = jest.fn(() => Promise.resolve({
        teamId: "teamId",
        botAccessToken
      }));
      Channel.findOrCreate = jest.fn(() => Promise.resolve([{}, true]));
      Channel.findOne = jest.fn(() => Promise.resolve('channelId'));
      auth.checkSlackAssociationStatus = jest.fn(() =>
        Promise.resolve([true, { dwAccessToken }])
      );
      slack.botBelongsToChannel = jest.fn(() => Promise.resolve(true));
      slack.openView = jest.fn(() => Promise.resolve({}));
      slack.sendResponse = jest.fn(() => Promise.resolve({}));
    })

    it('should handle a successful action', async done => {
      // Perform a deep copy
      const updatedBlocks = JSON.parse(JSON.stringify(datasetRequestActionPayload.message.blocks));
      updatedBlocks[2] = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Request rejected by <@${datasetRequestActionPayload.user.id}>*`
        }
      };

      dataworld.rejectDatasetRequest = jest.fn(() => Promise.resolve({}));

      request(server)
        .post("/api/v1/command/action")
        .send({ payload: JSON.stringify(datasetRequestActionPayload) })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(dataworld.rejectDatasetRequest).toHaveBeenCalledWith(
            dwAccessToken,
            requestid,
            agentid,
            datasetid
          );
          expect(slack.sendResponse).toBeCalledWith(
            datasetRequestActionPayload.response_url,
            {
              replace_original: true,
              blocks: updatedBlocks
            }
          );
          expect(slack.openView).not.toHaveBeenCalled();
          done();
        });
    });

    it('should show a modal view when an action is unsuccessful', async done => {
      const modalView = {
        type: 'modal',
        title: {
          type: 'plain_text',
          text: 'Something went wrong 😞'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'You are not authorized to manage this request.'
            }
          }
        ]
      }

      dataworld.rejectDatasetRequest = jest.fn(() =>
        Promise.reject({ response: { status: 403 } })
      );

      request(server)
        .post("/api/v1/command/action")
        .send({ payload: JSON.stringify(datasetRequestActionPayload) })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(dataworld.rejectDatasetRequest).toHaveBeenCalledWith(
            dwAccessToken,
            requestid,
            agentid,
            datasetid
          );
          expect(slack.sendResponse).not.toHaveBeenCalled();
          expect(slack.openView).toHaveBeenCalledWith(
            botAccessToken,
            datasetRequestActionPayload.trigger_id,
            modalView
          );
          done();
        });
    });
  });
});
