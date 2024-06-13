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

const crypto = require('crypto');

const verifySlackRequest = async (headers, body) => {
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    const slackTimestamp = headers["x-slack-request-timestamp"];
    const slackSignature = headers["x-slack-signature"];
  
    if (!(slackSigningSecret && slackTimestamp && slackSignature)) return false;
  
    // It could be a replay attack, if the request timestamp is more than five minutes from local time.
    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(slackTimestamp, 10) > 60 * 5) return false;
  
    // Validate the slack signature by comparing with computed signature
    const signatureBaseString = "v0:" + slackTimestamp + ":" + body;
    const mySignature = "v0=" + crypto.createHmac("sha256", slackSigningSecret).update(signatureBaseString, 'utf8').digest("hex");
    return crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'));
  };
  
const verifySlackClient = (req, res, next) => {
    if (verifySlackRequest(req.headers, req.rawBody)) {
      if (req.body.challenge) {
        // Respond to slack challenge.
        return res.status(200).send({ challenge: req.body.challenge });
      }
      if (req.body.ssl_check) {
        return res.status(200).send();
      }
      next();
    } else {
      next(new Error("Could not verify the request originated from Slack."));
    }
  };


module.exports = {
    verifySlackClient,
    verifySlackRequest
};
