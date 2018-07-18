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
      const slackUsername = "slackUsername";
      const teamId = "teamId";
      const botAccessToken = "botAccessToken";
      const dwAccessToken = "dwAccessToken";

      const update = jest.fn(() => Promise.resolve());
      const user = { dwAccessToken, update };

      Team.findOne = jest.fn(() => Promise.resolve({ botAccessToken }));
      User.findOrCreate = jest.fn(() => Promise.resolve([user, false]));
      slack.sendAuthRequiredMessage = jest.fn(() => Promise.resolve());

      await auth.beginSlackAssociation(slackUserId, slackUsername, teamId);

      expect(Team.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOrCreate).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledTimes(1);
      expect(slack.sendAuthRequiredMessage).toHaveBeenCalledTimes(1);
      done();
    },
    10000
  );

  it("should begin unfurl slack association", async done => {
    const userId = "userId";
    const messageTs = "messageTs";
    const channel = "channel";
    const teamId = "teamId";
    const accessToken = "accessToken";

    const update = jest.fn(() => Promise.resolve());
    const user = { update };

    Team.findOne = jest.fn(() => Promise.resolve({ accessToken }));
    User.findOrCreate = jest.fn(() => Promise.resolve([user, false]));
    slack.startUnfurlAssociation = jest.fn(() => Promise.resolve());

    await auth.beginUnfurlSlackAssociation(userId, messageTs, channel, teamId);

    expect(Team.findOne).toHaveBeenCalledTimes(1);
    expect(User.findOrCreate).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(slack.startUnfurlAssociation).toHaveBeenCalledTimes(1);

    done();
  }, 10000);

});
