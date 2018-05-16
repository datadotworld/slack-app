const axios = require("axios");
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

const slack = {
  
  sendResponse(responseUrl, data) {
    axios.post(responseUrl, data, { headers: headers });
  },

  oauthAccess(code) {
    console.log("oauthAccess called!!!.")
    let params = {
      code: code,
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET
    };

    return axios.get(process.env.SLACK_OAUTH_ACCESS_URL, {
      headers: headers,
      params: params
    });
  }
};

module.exports = { slack };
