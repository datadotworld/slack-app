const slack = require("../slack");
const axios = require("axios");

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

describe("Test slack api wrapper.", () => {
  it("should exhange auth code for access token", done => {
    const code = "code";
    let params = {
      code: code,
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET
    };

    axios.get = jest.fn(() => Promise.resolve());

    slack.oauthAccess(code);

    expect(axios.get).toHaveBeenCalledWith(
      "https://slack.com/api/oauth.v2.access",
      { headers, params }
    );

    done();
  });

  it("should send response to slack", done => {
    const data = {};
    const responseUrl = "responseUrl";

    axios.post = jest.fn(() => Promise.resolve());

    slack.sendResponse(responseUrl, data);

    expect(axios.post).toHaveBeenCalledWith(responseUrl, data, { headers });

    done();
  });
});
