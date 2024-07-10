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
const { handleDatasetRequestAction } = require('../../../controllers/commands/request')
const handle = async (payload, action, user) => {
    // Handle 
    const { requestid, agentid, datasetid } = JSON.parse(action.value)
    await handleDatasetRequestAction({
      channelid: payload.channel.id,
      userid: payload.user.id,
      triggerid: payload.trigger_id,
      responseUrl: payload.response_url,
      message: payload.message,
      blockid: action.block_id,
      actionid: action.action_id,
      requestid,
      agentid,
      datasetid,
      dwAccessToken: user.dwAccessToken,
    });
};

// Visible for testing
module.exports = {
    handle
};