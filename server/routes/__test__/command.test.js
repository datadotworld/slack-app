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

describe("POST /api/v1/command/ - Process slash command", () => {
  it("should respond to slack challenge request", done => {
    const challenge = "challenge";
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
    \"type\":\"interactive_message\",
    \"actions\":[{
      \"name\":\"subscription_list\",
      \"type\":\"select\",
      \"selected_options\":[{
        \"value\":\"kennyshittu\/test-new-actors-data\"
      }]
    }],
    \"callback_id\":\"unsubscribe_menu\",
    \"team\":{
      \"id\":\"TAZ5ZUB7D\",
      \"domain\":\"dwbotworkspace\"
    },
    \"channel\":{
      \"id\":\"GBPSMFGH2\",
      \"name\":\"privategroup\"
    },
    \"user\":{
      \"id\":\"UB05RLNS2\",
      \"name\":\"kehinde.a.shittu\"
    },
    \"action_ts\":\"1531487581.307505\",
    \"message_ts\":\"1531487576.000154\",
    \"attachment_id\":\"1\",
    \"token\":\"4ld7Y3ZjWp5gRhi0EcMnqYEV\",
    \"is_app_unfurl\":false,
    \"response_url\":\"https:\/\/hooks.slack.com\/actions\/TAZ5ZUB7D\/398173347970\/hFb2X8rFRzthYQl9QGrpdc0C\",
    \"trigger_id\":\"397616350305.373203963251.0f5e6875d7a8b384db606cd9d9f6b7dc\"
  }`;

  const button_action_payload = `{
    \"type\":\"interactive_message\",
    \"actions\":[{
      \"name\":\"subscribe\",
      \"type\":\"button\",
      \"value\":\"kehesjay\\\/actors-proj\"
    }],
    \"callback_id\":\"dataset_subscribe_button\",
    \"team\":{
      \"id\":\"TAZ5ZUB7D\",
      \"domain\":\"dwbotworkspace\"
    },
    \"channel\":{
      \"id\":\"GBRPJRPDH\",
      \"name\":\"privategroup\"
    },
    \"user\":{
      \"id\":\"UB05RLNS2\",
      \"name\":\"kehinde.a.shittu\"
    },
    \"action_ts\":\"1532002514.131704\",
    \"message_ts\":\"1532002506.000200\",
    \"attachment_id\":\"1\",
    \"token\":\"4ld7Y3ZjWp5gRhi0EcMnqYEV\",
    \"is_app_unfurl\":true,
    \"original_message\":{
      \"attachments\":[{
        \"callback_id\":\"dataset_subscribe_button\",
        \"fallback\":\"actors-proj\",
        \"text\":\"Keep track of nollywood actors project in 2018.\",
        \"title\":\"actors-proj\",
        \"footer\":\"kehesjay\\\/actors-proj\",
        \"id\":\"1\",
        \"title_link\":\"https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\",
        \"thumb_height\":512,
        \"thumb_width\":512,
        \"thumb_url\":\"https:\\\/\\\/cdn.filepicker.io\\\/api\\\/file\\\/XYpHGiLQfKj2tQqH9HwC\",
        \"footer_icon\":
        \"https:\\\/\\\/cdn.filepicker.io\\\/api\\\/file\\\/N5PbEQQ2QbiuK3s5qhZr\",
        \"ts\":1531955022,
        \"color\":\"F6BD68\",
        \"fields\":[{
          \"title\":\"\",
          \"value\":\"\`actors\` \`data\` \`test\` \",
          \"short\":false
        },
        {
          \"title\":\"Linked datasets\",
          \"value\":\"\\u2022 <https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\\\/dataset?datasetid=proj4test|proj_4_test>\\n\\u2022 <https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\\\/dataset?datasetid=cool-data|cool-data>\\n\\u2022 <https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\\\/dataset?datasetid=nolly-dataset|nolly dataset>\\n\\u2022 <https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\\\/dataset?datasetid=test-new-data|test-new-data>\\n\\u2022 <https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\\\/dataset?datasetid=test-cdi|test cdi>\\n<https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj|See more>\\n\",
          \"short\":false
        }],
        \"actions\":[{
          \"id\":\"1\",
          \"text\":\"Explore :microscope:\",
          \"type\":\"button\",
          \"style\":\"\",
          \"url\":\"https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\\\/workspace\"
        },
        {
          \"id\":\"2\",
          \"name\":\"subscribe\",
          \"text\":\"Subscribe :nerd_face:\",
          \"type\":\"button\",
          \"value\":\"kehesjay\\\/actors-proj\",
          \"style\":\"primary\"
        }],
        \"mrkdwn_in\":[\"fields\"],
        \"bot_id\":\"BBS0N97PC\",
        \"app_unfurl_url\":\"https:\\\/\\\/data.world\\\/kehesjay\\\/actors-proj\",
        \"is_app_unfurl\":true
      }
    ]},
    \"response_url\":\"https:\\\/\\\/hooks.slack.com\\\/actions\\\/TAZ5ZUB7D\\\/400690536912\\\/hbVIN3Xo97Hh0mDG0e2wQoZ4\",
    \"trigger_id\":\"402725352246.373203963251.50f933b0da72e4cb4becec2d8c101ea2\"
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
    const resourceId = action.selected_options[0].value;
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
