/*
 * Data.World Slack Application
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
const axios = require("axios");
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

const slack = {
  
  sendResponse(responseUrl, data) {
    return axios.post(responseUrl, data, { headers: headers });
  },

  oauthAccess(code) {
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
