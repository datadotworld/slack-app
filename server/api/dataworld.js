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

const accessTokenUrl = `${baseTokenUrl}=authorization_code&code=`;
const refreshTokenUrl = `${baseTokenUrl}=refresh_token&refresh_token=`;

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

const subscribeToProject = (owner, id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
  return put(requestUrl, events, token);
};

const subscribeToAccount = (id, token) => {
  const requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
  return put(requestUrl, events, token);
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
  unsubscribeFromDataset,
  unsubscribeFromProject,
  unsubscribeFromAccount,
  verifyDwToken
};
