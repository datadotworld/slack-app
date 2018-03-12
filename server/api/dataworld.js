const unirest = require("unirest");

const accessTokenUrl = process.env.ACCESS_TOKEN_URL;
const baseUrl = process.env.DW_BASE_URL;
const headers = { Accept: "application/json", "Content-Type": "application/json" };

const post = (url, data, token, cb) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  unirest
    .post(url)
    .headers(headers)
    .send(data)
    .end(function (response) {
      cb(response);
    });
};

const get = (url, token, cb) => {
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  unirest
    .get(url)
    .headers(headers)
    .end(function (response) {
      cb(response);
    });
};

const dataworld = {

  exchangeAuthCode(code, cb) {
    let requestUrl = `${accessTokenUrl}${code}`;
    post(requestUrl, {}, (res) => {
      if (res.error) {
        cb(res.error, null);
      } else {
        cb(null, res.body.access_token);
      }
    });
  },

  verifyDwToken(token) {
    let requestUrl = `${baseUrl}/user`;
    return new Promise((resolve, reject) => {
      get(requestUrl, token, null, (res) => {
        if (res.error) {
          if (res.code === 401) {
            resolve(false);
          } else {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
      });
    });
  },

  getDataset(id, owner, token) {
    let requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    return new Promise((resolve, reject) => {
      get(requestUrl, token, (res) => {
        if (res.error) {
          reject(res.error);
        } else {
          resolve(res.body);
        }
      });
    });
  },

  getProject(id, owner, token) {
    let requestUrl = `${baseUrl}/projects/${owner}/${id}`;
    return new Promise((resolve, reject) => {
      get(requestUrl, token, (res) => {
        if (res.error) {
          reject(res.error);
        } else {
          resolve(res.body);
        }
      });
    });
  },

  getInsight(id, projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    return new Promise((resolve, reject) => {
      get(requestUrl, token, (res) => {
        if (res.error) {
          reject(res.error);
        } else {
          resolve(res.body);
        }
      });
    });
  },
};

module.exports = { dataworld };
