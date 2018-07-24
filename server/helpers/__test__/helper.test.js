const helper = require("../helper");
const Subscription = require("../../models").Subscription;

describe("Test helper methods", () => {
  it("should extract params from dataset command", done => {
    const command = "subscribe owner/datasetid";

    const result = helper.extractParamsFromCommand(command, false);

    expect(result).toHaveProperty("owner", "owner");
    expect(result).toHaveProperty("id", "datasetid");

    done();
  });

  it("should extract params from account command", done => {
    const command = "unsubscribe agent";

    const result = helper.extractParamsFromCommand(command, true);

    expect(result.owner).toBeNull();
    expect(result).toHaveProperty("id", "agent");

    done();
  });

  it("should extract dataset or project params from link", done => {
    const link = "https://data.world/owner/datasetid";

    const result = helper.extractDatasetOrProjectParamsFromLink(link);

    expect(result).toHaveProperty("owner", "owner");
    expect(result).toHaveProperty("datasetId", "datasetid");
    expect(result).toHaveProperty("link", link);

    done();
  });

  it("should extract insight params from link", done => {
    const link = "https://data.world/owner/projectid/insights/insightid";

    const result = helper.extractInsightParams(link);

    expect(result).toHaveProperty("owner", "owner");
    expect(result).toHaveProperty("insightId", "insightid");
    expect(result).toHaveProperty("projectId", "projectid");
    expect(result).toHaveProperty("link", link);

    done();
  });

  it("should extract insights params from link", done => {
    const link = "https://data.world/owner/projectid/insights";

    const result = helper.extractInsightsParams(link);

    expect(result).toHaveProperty("owner", "owner");
    expect(result).toHaveProperty("projectId", "projectid");
    expect(result).toHaveProperty("link", link);

    done();
  });

  it("should extract agentid from link", done => {
    const link = "https://data.world/agentid";

    const id = helper.extractIdFromLink(link);

    expect(id).toEqual("agentid");

    done();
  });

  it("should clean slack link input", done => {
    const link = "<https://data.world/owner/datasetid>";

    const result = helper.cleanSlackLinkInput(link);

    expect(result).toEqual("owner/datasetid");

    done();
  });

  it("should return true when subscription belongs to Channel and User", async done => {
    const resourceid = "resourceId",
      channelId = "channelId",
      userId = "userId";

    Subscription.findAll = jest.fn(() => Promise.resolve([{ channelId }]));
    const [hasSubscriptionInChannel, removeDWsubscription] = await helper.getSubscriptionStatus(
      resourceid,
      channelId,
      userId
    );

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(hasSubscriptionInChannel).toBeTruthy();
    expect(removeDWsubscription).toBeTruthy();

    done();
  });

  it("should return false when belongsToChannelAndUser throws error", async done => {
    const resourceid = "resourceId",
      channelid = "channelId",
      userId = "userId";

    Subscription.findAll = jest.fn(() =>
      Promise.reject(new Error("Test error"))
    );
    const [hasSubscriptionInChannel, removeDWsubscription] = await helper.getSubscriptionStatus(
      resourceid,
      channelid,
      userId
    );

    expect(Subscription.findAll).toHaveBeenCalledTimes(1);
    expect(hasSubscriptionInChannel).toBeFalsy();
    expect(removeDWsubscription).toBeFalsy();
    done();
  });
});
