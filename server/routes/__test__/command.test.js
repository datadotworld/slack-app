const request = require("supertest");
const server = require("../../app");
const auth = require("../../controllers/auth");
const dataworld = require("../../api/dataworld");
const slack = require("../../api/slack");
const helper = require("../../helpers/helper");

const Channel = require("../../models").Channel;

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

describe("POST /api/v1/command/action - Process a button action", () => {
  const payload = `{
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

  const payloadObject = JSON.parse(payload);
  const action = payloadObject.actions[0];
  const resourceId = action.selected_options[0].value;

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
    const isAssociated = true;
    const dwAccessToken = "dwAccessToken";
    const user = { dwAccessToken };
    const message = "Webhook subscription deleted successfully.";
    const response = { data: { message } };

    Channel.findOne = jest.fn(() => Promise.resolve({}));
    auth.checkSlackAssociationStatus = jest.fn(() =>
      Promise.resolve([isAssociated, user])
    );
    helper.belongsToChannelAndUser = jest.fn(() => Promise.resolve(true));
    dataworld.unsubscribeFromDataset = jest.fn(() => Promise.resolve(response));
    slack.sendResponse = jest.fn(() => Promise.resolve());

    request(server)
      .post("/api/v1/command/action")
      .send({ payload })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(Channel.findOne).toHaveBeenCalledTimes(1);
        expect(helper.belongsToChannelAndUser).toBeCalledWith(
          resourceId,
          payloadObject.channel.id,
          payloadObject.user.id
        );
        expect(auth.checkSlackAssociationStatus).toBeCalledWith(
          payloadObject.user.id
        );
        const parts = resourceId.split("/");
        expect(dataworld.unsubscribeFromDataset).toBeCalledWith(
          parts.shift(),
          parts.shift(),
          dwAccessToken
        );
        expect(
          slack.sendResponse(payloadObject.response_url, { text: message })
        );
        done();
      });
  });

  // it("should perform project unsubscribe menu action for associated user in know channel", done => {});

  // it("should perform account unsubscribe menu action for associated user in know channel", done => {});

  // it("should not perform interactive action from unknown channels", done => {});

  // it("should not perform interactive action from unassociated users", done => {});

  // it("should not perform interactive action from unassociated users", done => {});
});
