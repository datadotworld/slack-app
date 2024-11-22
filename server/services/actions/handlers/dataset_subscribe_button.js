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
const commandService = require("../../../services/commands");
const slack = require('../../../api/slack');
const array = require('lodash/array')

const handle = async (payload, action, user) => {
    // Handle 
    await commandService.handleDatasetorProjectSubscribeCommand(
        payload.user.id,
        payload.channel.id,
        `subscribe ${action.value}`,
        payload.response_url,
        user.dwAccessToken
    );
    if (payload.container.is_app_unfurl) {
        array.remove(payload.app_unfurl.blocks.find(t => t.type === 'actions').elements, element => {
            return element.action_id === "dataset_subscribe_button";
        });
        // update unfurl attachment
        await slack.sendResponseMessageAndBlocks(payload.response_url, '', payload.app_unfurl.blocks, true);
    } else {
        // update message attachments
        array.remove(payload.message.blocks.find(t => t.type === 'actions').elements, element => {
            return element.action_id === "dataset_subscribe_button";
        });
        await slack.sendResponseMessageAndBlocks(payload.response_url, '', payload.message.blocks, true);
    }

};

// Visible for testing
module.exports = {
    handle
};