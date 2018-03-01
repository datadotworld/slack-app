const unirest = require('unirest');

const slack = {
  sendResponse(respoonseUrl, data) {
    unirest.post(respoonseUrl)
      .headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' })
      .send(data)
      .end(function(response) {
        console.log(response.body);
      });
  }
};

module.exports = { slack };
