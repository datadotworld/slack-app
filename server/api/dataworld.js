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

const baseTokenUrl = `${process.env.DW_GET_TOKEN_BASE_URL}?client_id=${
  process.env.DW_CLIENT_ID
}&client_secret=${
  process.env.DW_CLIENT_SECRET
}&grant_type=`;

const baseRevokeUrl = `${process.env.DW_REVOKE_TOKEN_BASE_URL}/${
  process.env.DW_CLIENT_ID
}`;

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

const del = (url, token) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return axios.delete(url, { headers: headers });
};

const exchangeAuthCode = code => {
  const requestUrl = `${accessTokenUrl}${code}`;
  return post(requestUrl, {}, null);
};

const refreshToken = refreshToken => {
  const requestUrl = `${refreshTokenUrl}${refreshToken}`;
  return post(requestUrl, {}, null);
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

const revokeDWToken = (agentId, token) => {
  return del(`https://pdw-dwapi.prod.data.world/api/v0/oauths/token/${process.env.DW_CLIENT_ID}/${agentId}`, token);
  // const revokeHeaders = {
  //   Accept: "application/json",
  //   "Content-Type": "application/json",
  //   "Accept-Encoding": "gzip, deflate, br",
  //   "x-csrf-token": "id1dsk.fky9j",
  //   "Origin": "https://data.world",
  //   Cookie: `_csrf=id1dsk.fky9j; token=${token}`
  // } 
  // // id1dsk.fky9j
  // return axios.delete(`https://pdw-dwapi.prod.data.world/oauths/token/{clientid}/{agentid}`, { headers: revokeHeaders });
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

const verifySubscriptionExists = async (resourseId, token) => {
  try {
    let isSubscribed = false;
    if (resourseId.includes("/")) {
      const data = resourseId.split("/");
      const id = data.pop();
      const owner = data.pop();
      let response;
      try{
        // checks if project exist
        response = await getProjectSubscription(owner, id, token);
        isSubscribed = response.data.project ? true : false;
      } catch (error) {
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

const deleteSubscription = async (resourseId, token) => {
  try {
    let isDeleted = false;
    if (resourseId.includes("/")) {
      const data = resourseId.split("/");
      const id = data.pop();
      const owner = data.pop();
      let response;
      try{
        // handle as project
        response = await unsubscribeFromProject(owner, id, token);
        isDeleted = response.data.code ? false : true;
      } catch (error) {
        response = await unsubscribeFromDataset(owner, id, token);
        isDeleted = response.data.code ? false : true;
      }
    } else {
      const response = await unsubscribeFromAccount(resourseId, token);
      isSubscribed = response.data.code ? false : true;
    }
    return isDeleted;
 } catch (error) {
   console.error(`Failed to delete subscription ${resourseId} in DW `, error.message);
   return false;
 }
};

module.exports = {
  exchangeAuthCode,
  getActiveDWUser,
  getDWUser,
  getDataset,
  getProject,
  getProjectByVersion,
  getInsight,
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
  verifyDwToken,
  refreshToken,
  verifySubscriptionExists,
  revokeDWToken
};
