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
      return res.data ? Promise.resolve(true) : Promise.resolve(false);
    } catch(error) {
      return error.response.status === 401 ? Promise.resolve(false) : Promise.reject(error);
    }
  },

  async getDataset(id, owner, token) {
    let requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    try {
      let res = await get(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async getProject(id, owner, token) {
    let requestUrl = `${baseUrl}/projects/${owner}/${id}`;
    try {
      let res = await get(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async getInsight(id, projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    try {
      let res = await get(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async getInsights(projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}`;
    try {
      let res = await get(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async subscribeToDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    try {
      let res = await put(requestUrl, events, token);
      return Promise.resolve(res.body);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async subscribeToProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    try {
      let res = await put(requestUrl, events, token);
      return Promise.resolve(res.body);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async subscribeToAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    try {
      let res = await put(requestUrl, events, token);
      return Promise.resolve(res.body);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async unsubscribeFromDataset(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/datasets/${owner}/${id}`;
    try {
      let res = await del(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async unsubscribeFromProject(owner, id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/projects/${owner}/${id}`;
    try {
      let res = await del(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async unsubscribeFromAccount(id, token) {
    let requestUrl = `${baseUrl}/user/webhooks/users/${id}`;
    try {
      let res = await del(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  },

  async getSubscriptions(token) {
    let requestUrl = `${baseUrl}/user/webhooks`;
    try {
      let res = await get(requestUrl, token);
      return Promise.resolve(res.data);
    } catch(error) {
      return Promise.reject(error);
    }
  }
};

module.exports = { dataworld };
