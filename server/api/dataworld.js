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
const axios = require("axios");
const axiosRetry = require('axios-retry');
const helper = require("../helpers/helper");

axiosRetry(axios, { 
  retries: 3,
  shouldResetTimeout: true,
  retryDelay: helper.getDelay,
  retryCondition: helper.shouldRetry
});

const baseTokenUrl = `${process.env.DW_GET_TOKEN_BASE_URL}?client_id=${
  process.env.DW_CLIENT_ID
}&client_secret=${
  process.env.DW_CLIENT_SECRET
}&grant_type=`;

const accessTokenUrl = `${baseTokenUrl}authorization_code&code=`;
const refreshTokenUrl = `${baseTokenUrl}refresh_token&refresh_token=`;

const baseUrl = process.env.DW_BASE_URL;
const events = { events: ["ALL"] };
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

const post = (url, data, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.post(url, data, { headers });
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

const del = (url, token, params) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.delete(url, {
    headers: headers,
    params: params
  });
};

const exchangeAuthCode = code => {
  const requestUrl = `${accessTokenUrl}${code}`;
  return post(requestUrl, {});
};

const refreshToken = async refreshToken => {
  try {
    const data = {
      client_id: process.env.DW_CLIENT_ID,
      client_secret: process.env.DW_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }
    return await post(process.env.DW_GET_TOKEN_BASE_URL, data);
  } catch(error) {
    console.error(error)
    console.error("Failed to refesh DW token : ", error.message);
    return;
  }
};

const getActiveDWUser = token => {
  const requestUrl = `${baseUrl}/user`;
  return get(requestUrl, token);
};

const getDWUser = (token, account) => {
  const requestUrl = `${baseUrl}/users/${account}`;
  return get(requestUrl, token);
};

const getDataset = (id, owner, token) => {
  const requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
  return get(requestUrl, token);
};

const getProject = (id, owner, token) => {
  const requestUrl = `${baseUrl}/projects/${owner}/${id}`;
  return get(requestUrl, token);
};

const getProjectByVersion = (id, owner, versionId, token) => {
  const requestUrl = `${baseUrl}/projects/${owner}/${id}/v/${versionId}`;
  return get(requestUrl, token);
};

const getInsight = (id, projectId, owner, token) => {
  const requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
  return get(requestUrl, token);
};

const getQuery = (id, token) => {
  const requestUrl = `${baseUrl}/queries/${id}`;
  return get(requestUrl, token);
};

const getInsights = (projectId, owner, token) => {
  const requestUrl = `${baseUrl}/insights/${owner}/${projectId}`;
  return get(requestUrl, token);
};

const getSubscriptions = token => {
  const requestUrl = `${baseUrl}/user/webhooks`;
  return get(requestUrl, token);
};

const subscribeToDataset = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
  return put(requestUrl, events, token);
};

const getDatasetSubscription = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
  return get(requestUrl, token);
};

const subscribeToProject = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
  return put(requestUrl, events, token);
};

const getProjectSubscription = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
  return get(requestUrl, token);
};

const subscribeToAccount = (id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
  return put(requestUrl, events, token);
};

const getAccountSubscription = (id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
  return get(requestUrl, token);
};

const unsubscribeFromDataset = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
  return del(requestUrl, token);
};

const unsubscribeFromProject = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
  return del(requestUrl, token);
};

const unsubscribeFromAccount = (id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
  return del(requestUrl, token);
};

const verifyDwToken = async token => {
  const requestUrl = `${baseUrl}/user`;
  try {
    const res = await get(requestUrl, token);
    return res.data ? true : false;
  } catch (error) {
    console.error("DW token verification failed : ", error.message);
    return false;
  }
};

const verifySubscriptionExists = async (resourseId, token, isProject) => {
  try {
    let isSubscribed = false;
    if (resourseId.includes("/")) {
      const data = resourseId.split("/");
      const id = data.pop();
      const owner = data.pop();
      let response;
      if(isProject) {
        // checks if subscription to project exists
        response = await getProjectSubscription(owner, id, token);
        isSubscribed = response.data.project ? true : false;
      } else {
        // checks if subscription to dataset exists
        response = await getDatasetSubscription(owner, id, token);
        isSubscribed = response.data.dataset ? true : false;
      }
    } else {
      const response = await getAccountSubscription(resourseId, token);
      isSubscribed = response.data.user ? true : false;
    }
    return isSubscribed;
 } catch (error) {
   console.error(`Failed to verify subscription to ${resourseId} in DW `, error.message);
   return false;
 }
};

const acceptDatasetRequest = async (token, requestid, agentid, datasetid) => {
  const requestUrl = `${baseUrl}/requests/accept`;
  const data = { requestid, owner: agentid, resourceid: datasetid };
  return post(requestUrl, data, token);
}

const rejectDatasetRequest = async (token, requestid, agentid, datasetid) => {
  const requestUrl = `${baseUrl}/requests/reject`;
  const data = { requestid, owner: agentid, resourceid: datasetid };
  return post(requestUrl, data, token);
}

const cancelDatasetRequest = async (token, requestid, agentid, datasetid) => {
  const requestUrl = `${baseUrl}/requests/${requestid}`;
  const params = { owner: agentid, resourceid: datasetid }
  return del(requestUrl, token, params)
}

module.exports = {
  exchangeAuthCode,
  getActiveDWUser,
  getDWUser,
  getDataset,
  getProject,
  getProjectByVersion,
  getInsight,
  getQuery,
  getInsights,
  getSubscriptions,
  subscribeToDataset,
  subscribeToProject,
  subscribeToAccount,
  getDatasetSubscription,
  getProjectSubscription,
  getAccountSubscription,
  unsubscribeFromDataset,
  unsubscribeFromProject,
  unsubscribeFromAccount,
  acceptDatasetRequest,
  rejectDatasetRequest,
  cancelDatasetRequest,
  verifyDwToken,
  refreshToken,
  verifySubscriptionExists
};
