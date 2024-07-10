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
const { getHandler } = require('../services/actions/action-provider')

const commandService = require('../services/commands')

const handleButtonAction = async (payload, action, user) => {
  const actionHandler = getHandler(action.action_id);
  if (actionHandler) {
    await actionHandler.handle(payload, action, user);
  } else {
    // unknow action
    console.warn(`Unknown action_id in button action event ${action.action_id}`);
  }
}

const handleMenuAction = async (payload, action) => {
  if (action.action_id === 'unsubscribe_menu') {
    const value = action.selected_option.value
    if (value.includes('/')) {
      //unsubscribe from project of dataset
      await commandService.handleDatasetOrProjectUnsubscribeCommand(
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
      )
    } else {
      // unsubscribe from account
      await commandService.handleUnsubscribeFromAccount(
        payload.channel.id,
        `unsubscribe ${value}`,
        payload.response_url,
      )
    }
    // Updated list of subscriptions
    await commandService.handleListSubscriptionCommand(
      payload.response_url,
      payload.channel.id,
      payload.user.id,
      true,
      true,
    )
  } else {
    // unknow action
    console.warn('Unknown callback_id in menu action event.')
    return
  }
}

// Visible for testing
module.exports = {
  handleButtonAction,
  handleMenuAction,
}
