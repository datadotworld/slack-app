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
const searchService = require('../../../search');
const { getBotAccessTokenForTeam } = require('../../../../helpers/tokens');
const slack = require('../../../../api/slack');

const handle = async (payload, action, user) => {
    // Handle 
    const { value } = action;
    const { blocks } = payload.view;

    const [searchTerm, nextPage] = value.split(" ");

    if (searchTerm && nextPage) {
        const resultBlocks = await searchService.getSearchBlocks(user.dwAccessToken, searchTerm, 3, nextPage);
        if (resultBlocks) {
            const { botToken } = await getBotAccessTokenForTeam(user.teamId);
            const [ searchBox, searchButton ] = blocks;
            await slack.publishAppHomeView(botToken, user.slackId, [searchBox, searchButton, ...resultBlocks]);
        }
    }
};

// Visible for testing
module.exports = {
    handle
};