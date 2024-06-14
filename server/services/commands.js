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

const Channel = require('../models').Channel
const Team = require('../models').Team

const collection = require('lodash/collection')
const lang = require('lodash/lang')

const helper = require('../helpers/helper')
const slack = require('../api/slack')
const subscriptionService = require('../services/subscription')
const { getBotAccessTokenForTeam } = require('../helpers/tokens')

// data.world command format
const commandText = process.env.SLASH_COMMAND
const dwDomain = helper.DW_DOMAIN

// Sub command format
const subscribeFormat = new RegExp(
  `^((\\\/${commandText})(subscribe) (https\\:\\\/\\\/${dwDomain}\\\/|)[\\w-\\\/]+)$`,
  'i',
)
const unsubscribeFormat = new RegExp(
  `^((\\\/${commandText})(unsubscribe) (https\\:\\\/\\\/${dwDomain}\\\/|)[\\w-\\\/]+)$`,
  'i',
)

// /data.world sub command types
const SUBSCRIBE_DATASET_OR_PROJECT = 'SUBSCRIBE_DATASET_OR_PROJECT'
const SUBSCRIBE_ACCOUNT = 'SUBSCRIBE_ACCOUNT'

const UNSUBSCRIBE_DATASET_OR_PROJECT = 'UNSUBSCRIBE_DATASET_OR_PROJECT'
const UNSUBSCRIBE_ACCOUNT = 'UNSUBSCRIBE_ACCOUNT'

// This method handles subscription to projects and datasets
const handleDatasetorProjectSubscribeCommand = async (
  userid,
  channelid,
  command,
  responseUrl,
  token,
) => {
  // Extract params from command
  const { id, owner } = helper.extractParamsFromCommand(command, false);
  await subscriptionService.subscribeToProjectOrDataset(userid, channelid, id, owner, responseUrl, token);
}

// Subscribe to a DW account
const handleAccountSubscribeCommand = async (
  userid,
  channelid,
  command,
  responseUrl,
  token,
) => {
  // use dataworld wrapper to subscribe to account
  const { id } = helper.extractParamsFromCommand(command, true)
  await subscriptionService.subscribeToAccount(userid, channelid, id, responseUrl, token);
}

const handleDatasetOrProjectUnsubscribeCommand = async (
  channelId,
  command,
  responseUrl,
) => {
  // extract params from command
  const {owner, id} = helper.extractParamsFromCommand(command, false)
  await subscriptionService.unsubscribeFromDatasetOrProject(channelId, owner, id, responseUrl);
}

const handleUnsubscribeFromAccount = async (channelId, command, responseUrl) => {
  // use dataworld wrapper to unsubscribe to account
  let {id} = helper.extractParamsFromCommand(command, true)
  await subscriptionService.unsubscribeFromAccount(channelId, id, responseUrl);
}

const handleListSubscriptionCommand = async (
  responseUrl,
  channelid,
  userId,
  replaceOriginal,
  deleteOriginal,
) => {
    await subscriptionService.listSubscription(responseUrl, channelid, replaceOriginal, deleteOriginal);
}

const sendSlackMessage = async (
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

const getType = (command, option) => {
  // determine type of command
  if (subscribeFormat.test(command)) {
    return option.indexOf('/') > 0
      ? SUBSCRIBE_DATASET_OR_PROJECT
      : SUBSCRIBE_ACCOUNT
  } else if (unsubscribeFormat.test(command)) {
    return option.indexOf('/') > 0
      ? UNSUBSCRIBE_DATASET_OR_PROJECT
      : UNSUBSCRIBE_ACCOUNT
  }
  console.error('Unknown command type : ', command)
  return
}

const subscribeOrUnsubscribe = (req, token) => {
  // Invalid / Unrecognized command is not expected to make it here.
  const command = req.body.command + helper.cleanSlackLinkInput(req.body.text)
  const commandType = getType(
    command,
    helper.cleanSlackLinkInput(req.body.text),
  )
  const responseUrl = req.body.response_url

  switch (commandType) {
    case SUBSCRIBE_DATASET_OR_PROJECT:
      handleDatasetorProjectSubscribeCommand(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token,
      )
      break
    case SUBSCRIBE_ACCOUNT:
      handleAccountSubscribeCommand(
        req.body.user_id,
        req.body.channel_id,
        command,
        responseUrl,
        token,
      )
      break
    case UNSUBSCRIBE_DATASET_OR_PROJECT:
      handleDatasetOrProjectUnsubscribeCommand(req.body.channel_id, command, responseUrl)
      break
    case UNSUBSCRIBE_ACCOUNT:
      handleUnsubscribeFromAccount(req.body.channel_id, command, responseUrl)
      break
    default:
      console.error('Attempt to process unknown command.', command)
      break
  }
}

const showHelp = async (responseUrl) => {
  const commandText = process.env.SLASH_COMMAND

  const message = `Not sure how to use \`/${commandText}\`? Here are some ideas:point_down:`
  const blocks = []

  const commandsInfo = [
    `Not sure how to use \`/${commandText}? Here are some ideas:point_down:`,
    `_Subscribe to a data.world dataset:_ \n \`/${commandText} subscribe dataset_url\``,
    `_Subscribe to a data.world project:_ \n \`/${commandText} subscribe project_url\``,
    `_Subscribe to a data.world account:_ \n \`/${commandText} subscribe account\``,
    `_Unsubscribe from a data.world dataset:_ \n \`/${commandText} unsubscribe dataset_url\``,
    `_Unsubscribe from a data.world project:_ \n \`/${commandText} unsubscribe project_url\``,
    `_Unsubscribe from a data.world account:_ \n \`/${commandText} unsubscribe account\``,
    `_List active subscriptions._ : \n \`/${commandText} list\``,
    //Note: This feature is not tested fully. So disabling this feature.
    `_Get a webhook URL for the current channel:_ \n \`/${commandText} webhook\``,
  ]

  collection.forEach(commandsInfo, (value) => {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: value,
      },
    })
  })

  await sendSlackMessage(responseUrl, message, blocks)
}

const isBotPresent = async (teamId, channelid, slackUserId, responseUrl) => {
  // Check if bot was invited to slack channel
  // channel found, continue and process command
  const team = await Team.findOne({ where: { teamId: teamId } })
  const token = await getBotAccessTokenForTeam(teamId)
  const isPresent = await slack.botBelongsToChannel(channelid, token)

  if (isPresent) {
    // Find or create channel record in DB.(In a case where DB gets cleared, existing bot channels will be re-created in DB).
    const [channel, created] = await Channel.findOrCreate({
      where: { channelId: channelid },
      defaults: { teamId: teamId, slackUserId: slackUserId },
    })
    if (created) {
      console.warn('Re-created existing bot channel!!!')
    }
  } else {
    // inform user that bot user must be invited to channel
    const commandText = process.env.SLASH_COMMAND
    const message = slack.isDMChannel(channelid)
      ? `Oops! \`/${commandText}\` cannot be used here. Use it in public or private channels, or in DMs with <@${team.botUserId}>.`
      : `Sorry <@${slackUserId}>, you can't run \`/${commandText}\` until you've invited <@${team.botUserId}> to this channel. Run \`/invite <@${team.botUserId}>\`, then try again.`
    sendSlackMessage(responseUrl, message)
  }
  return isPresent
}

const sendErrorMessage = (payload) => {
  message = `Sorry <@${payload.user_id}>, I am unable to process command \`${payload.command}\` right now. Please, try again later.`
  sendSlackMessage(req.body.response_url, message)
}

// Visible for testing
module.exports = {
  isBotPresent,
  sendErrorMessage,
  handleDatasetorProjectSubscribeCommand,
  handleAccountSubscribeCommand,
  handleDatasetOrProjectUnsubscribeCommand,
  handleUnsubscribeFromAccount,
  handleListSubscriptionCommand,
  sendSlackMessage,
  getType,
  subscribeOrUnsubscribe,
  showHelp,
}
