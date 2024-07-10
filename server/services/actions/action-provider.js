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
const authorizationRequestActionButtonsHandler = require('./handlers/authorization_request_action_buttons');
const clearSearchResultsButton = require('./handlers/search/clear_search_results_button');
const datasetSubscribeButtonHandler = require('./handlers/dataset_subscribe_button');
const searchTermButtonHandler = require('./handlers/search/search_term_button');
const moreTermsButtonHandler = require('./handlers/search/more_terms_button');

const ACTIONS_HANDLER_MAP = {
    'authorization_request.accept' : authorizationRequestActionButtonsHandler,
    'authorization_request.cancel' : authorizationRequestActionButtonsHandler,
    'authorization_request.reject' : authorizationRequestActionButtonsHandler,
    'clear_search_results_button' : clearSearchResultsButton,
    'dataset_subscribe_button' : datasetSubscribeButtonHandler,
    'more_terms_button' : moreTermsButtonHandler,
    'search_term_button' : searchTermButtonHandler,
}

const getHandler = (actionId) => {
    return ACTIONS_HANDLER_MAP[actionId];
}

module.exports = { 
    getHandler,
};