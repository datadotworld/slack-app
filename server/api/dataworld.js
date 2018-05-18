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
      return error.response.status === 401 ? Promise.resolve(false) : Promise.reject(error);
    }
  },

  async getDataset(id, owner, token) {
    let requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    let res = await get(requestUrl, token);
    return res.data;
  },

  async getProject(id, owner, token) {
    let requestUrl = `${baseUrl}/projects/${owner}/${id}`;
    let res = await get(requestUrl, token);
    return res.data;
  },

  async getInsight(id, projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    let res = await get(requestUrl, token);
    return res.data;
  },

  async getInsights(projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}`;
    let res = await get(requestUrl, token);
    return res.data;
  },

  async subscribeToDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    let res = await put(requestUrl, events, token);
    return res.data;
  },

  async subscribeToProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    let res = await put(requestUrl, events, token);
    return res.data;
  },

  async subscribeToAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    let res = await put(requestUrl, events, token);
    return res.data;
  },

  async unsubscribeFromDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    let res = await del(requestUrl, token);
    return res.data;
  },

  async unsubscribeFromProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    let res = await del(requestUrl, token);
    return res.data;
  },

  async unsubscribeFromAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    let res = await del(requestUrl, token);
    return res.data;
  },

  async getSubscriptions(token) {
    let requestUrl = `${baseUrl}/user/webhooks`;
    let res = await get(requestUrl, token);
    return res.data;
  }
};

module.exports = { dataworld };
