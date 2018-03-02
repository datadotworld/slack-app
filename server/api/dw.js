const unirest = require('unirest');

const accessTokenUrl = process.env.ACCESS_TOKEN_URL;

const dw = {
  exchangeAuthCode(code, cb) {
  	let requestUrl = `${accessTokenUrl}${code}`
    unirest.post(requestUrl)
      .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' })
      .end(function(response) {
        console.log("DW response : ", response.body);
        cb(response.body.access_token);
      });
  },
};

module.exports = { dw };
