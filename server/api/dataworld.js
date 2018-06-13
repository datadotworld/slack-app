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
const accessTokenUrl = process.env.ACCESS_TOKEN_URL;
const baseUrl = process.env.DW_BASE_URL;
const headers = {
  "Accept": "application/json",
  "Content-Type": "application/json"
};
const events = { events: ["ALL"] };

const post = (url, data, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.post(url, data, { headers: headers });
};

const put = (url, data, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.put(url, data, { headers: headers });
};

const get = (url, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.get(url, { headers: headers });
};

const del = (url, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.delete(url, { headers: headers });
};

const dataworld = {

  exchangeAuthCode(code) {
    let requestUrl = `${accessTokenUrl}${code}`;
    return post(requestUrl, {}, null);
  },

  async verifyDwToken(token) {
    let requestUrl = `${baseUrl}/user`;
    try {
      let res = await get(requestUrl, token);
      return res.data ? true : false;
    } catch(error) {
      console.error("DW token verification failed : ", error);
      return false;
    }
  },

  getActiveDWUser(token) {
    let requestUrl = `${baseUrl}/user`;
    return get(requestUrl, token);
  },

  getDWUser(token, account) {
    let requestUrl = `${baseUrl}/users/${account}`;
    return get(requestUrl, token);
  },

  getDataset(id, owner, token) {
    let requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    return get(requestUrl, token);
  },

  getProject(id, owner, token) {
    let requestUrl = `${baseUrl}/projects/${owner}/${id}`;
    return get(requestUrl, token);
  },

  getProjectByVersion(id, owner, versionId, token) {
    let requestUrl = `${baseUrl}/projects/${owner}/${id}/v/${versionId}`;
    return get(requestUrl, token);
  },

  getInsight(id, projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    return get(requestUrl, token);
  },

  getInsights(projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}`;
    return get(requestUrl, token);
  },

  subscribeToDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    return put(requestUrl, events, token);
  },

  subscribeToProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    return put(requestUrl, events, token);
  },

  subscribeToAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    return put(requestUrl, events, token);
  },

  unsubscribeFromDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    return del(requestUrl, token);
  },

  unsubscribeFromProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    return del(requestUrl, token);
  },

  unsubscribeFromAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    return del(requestUrl, token);
  },

  getSubscriptions(token) {
    let requestUrl = `${baseUrl}/user/webhooks`;
    return get(requestUrl, token);
  }
};

module.exports = { dataworld };
