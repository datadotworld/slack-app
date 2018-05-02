const unirest = require('unirest');

const slack = {
  sendResponse(responseUrl, data) {
    unirest.post(responseUrl)
      .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' })
      .send(data)
      .end();
  },

  oauthAccess(code) {
    return unirest
      .get(process.env.SLACK_OAUTH_ACCESS_URL)
      .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' })
      .query({ code: code, client_id: process.env.SLACK_CLIENT_ID, client_secret: process.env.SLACK_CLIENT_SECRET })
      .end();
  }
};

module.exports = { slack };
