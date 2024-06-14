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
const array = require('lodash/array')
const lang = require('lodash/lang')

const slack = require('../api/slack')
const { handleDatasetRequestAction } = require('../controllers/commands/request')
const { AUTHORIZATION_ACTIONS } = require('../helpers/requests')

const commandService = require('../services/commands')

const sendSlackBlock = (responseUrl, block) => {
  try {
    //data.blocks = attachment;
    slack.sendResponse(responseUrl, { blocks: block }).catch(console.error)
  } catch (error) {
    console.error('Failed to send attachment to slack', error.message)
  }
}

const sendSlackBlocks = async (
  responseUrl,
  message,
  blocks,
  replaceOriginal,
  deleteOriginal,
) => {
  let data = { text: message }
  if (blocks && !lang.isEmpty(blocks)) {
    data.blocks = blocks
  }
  data.replace_original = replaceOriginal ? replaceOriginal : false
  data.delete_original = deleteOriginal ? deleteOriginal : false
  try {
    await slack.sendResponse(responseUrl, data)
  } catch (error) {
    console.error('Failed to send message to slack', error.message)
  }
}

const handleButtonAction = async (payload, action, user) => {
  if (action.action_id === 'dataset_subscribe_button') {
    await commandService.handleDatasetorProjectSubscribeCommand(
      payload.user.id,
      payload.channel.id,
      `subscribe ${action.value}`,
      payload.response_url,
      user.dwAccessToken,
    )

    if (payload.container.is_app_unfurl) {
      array.remove(
        payload.app_unfurl.blocks.find((t) => t.type === 'actions').elements,
        (element) => {
          return element.action_id === 'dataset_subscribe_button'
        },
      )
      // update unfurl attachment
      sendSlackBlock(payload.response_url, payload.app_unfurl.blocks)
    } else {
      // update message attachments
      array.remove(
        payload.message.blocks.find((t) => t.type === 'actions').elements,
        (element) => {
          return element.action_id === 'dataset_subscribe_button'
        },
      )
      sendSlackBlocks(payload.response_url, '', payload.message.blocks, true)
    }
  } else if (Object.values(AUTHORIZATION_ACTIONS).includes(action.action_id)) {
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
    })
  } else {
    // unknow action
    console.warn('Unknown action_id in button action event.')
    return
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
  sendSlackBlock,
  sendSlackBlocks,
  handleButtonAction,
  handleMenuAction,
}
