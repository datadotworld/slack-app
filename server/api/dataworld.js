const unirest = require("unirest");

const accessTokenUrl = process.env.ACCESS_TOKEN_URL;
const baseUrl = process.env.DW_BASE_URL;

const post = (url, data, cb) => {
  unirest
    .post(url)
    .headers({ Accept: "application/json", "Content-Type": "application/json" })
    .send(data)
    .end(function(response) {
      console.log("DW post esponse : ", response.body);
      cb(response);
    });
};

const get = (url, token, cb) => {
  unirest
    .get(url)
    .headers({ Accept: "application/json", "Content-Type": "application/json", "authorization": `Bearer ${token}`})
    .end(function(response) {
      console.log("DW get response : ", response.body);
      cb(response);
    });
};

const dataworld = {

  exchangeAuthCode(code, cb) {
    let requestUrl = `${accessTokenUrl}${code}`;
    post(requestUrl, {}, (res) => {
      if (res.error) {
        console.log("exchangeAuthCode error : ", res.error);
        cb(res.error, null);
      } else {
        console.log("exchangeAuthCode response", res.body);
        cb(null, res.body.access_token);
      }
    });
  },

  getDataset(id, owner, token) {
    let requestUrl = `${baseUrl}/datasets/${owner}/${id}`;
    console.log("getDataset req url is : ", requestUrl);
    return new Promise((resolve, reject) => {
      get(requestUrl, token, (res) => {
        if (res.error) {
          console.log("getDataset error : ", res.error);
          reject(res.error);
        } else {
          console.log("getDataset response", res.body);
          resolve(res.body);
        }
      });
    });
  },

  getProject(id, owner, token) {},

  getInsight(id, projectId, owner, token) {
    let requestUrl = `${baseUrl}/insights/${owner}/${projectId}/${id}`;
    console.log("Insight req url is : ", requestUrl);
    return new Promise((resolve, reject) => {
      get(requestUrl, token, (res) => {
        if (res.error) {
          console.log("getInsight error : ", res.error);
          reject(res.error);
        } else {
          console.log("getInsight response", res.body);
          resolve(res.body);
        }
      });
    });
  },
};

module.exports = { dataworld };
