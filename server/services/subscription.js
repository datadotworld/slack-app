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

const Subscription = require('../models').Subscription
const User = require('../models').User

const lang = require('lodash/lang')

const dataworld = require('../api/dataworld')
const helper = require('../helpers/helper')
const slack = require('../api/slack')

// data.world command format
const commandText = process.env.SLASH_COMMAND
const dwDomain = helper.DW_DOMAIN

// This method handles subscription to projects and datasets
const subscribeToProjectOrDataset = async (
  userid,
  channelid,
  id,
  owner,
  responseUrl,
  token,
) => {
  try {
    // Get resource from DW to be able to confirm type
    const response = await dataworld.getDataset(
      id,
      owner,
      token,
    )
    const dataset = response.data
    // check if same user has an existing / active subscription for this resource in DW
    const existsInDW = await dataworld.verifySubscriptionExists(
      `${owner}/${id}`,
      token,
      dataset.isProject,
    )
    if (!existsInDW) {
      if (dataset.isProject) {
        // use dataworld wrapper to subscribe to project
        await dataworld.subscribeToProject(
          owner,
          id,
          token,
        )
      } else {
        // use dataworld wrapper to subscribe to dataset
        await dataworld.subscribeToDataset(
          owner,
          id,
          token,
        )
      }
    }

    // check if subscription already exist in channel
    const channelSubscription = await Subscription.findOne({
      where: {
        resourceId: `${owner}/${id}`,
        channelId: channelid,
      },
    })

    // If DW subscription was not found and subscription exists locally (Most likely cos user revoked access)
    // Then update existing local record in this channel to correctly link to the new dw subscription
    if (!existsInDW && channelSubscription) {
      await channelSubscription.update(
        { slackUserId: userid },
        { fields: ['slackUserId'] },
      )
    }

    // This check will help ensure the appropiate message is sent to Slack in situations where
    // The subscription already exist locally in DB but not on DW api side, which means it wouldn't have showed up in a /data.world list command in channel.
    let message =
      !existsInDW || !channelSubscription
        ? `All set! You'll now receive notifications about *${id}* here.`
        : 'Subscription already exists in this channel. No further action required!'
    if (!channelSubscription) {
      // subscription not found in channel
      // Add subscription record to DB.
      await addSubscriptionRecord(
        owner,
        id,
        userid,
        channelid,
      )
    }
    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message)
  } catch (error) {
    // TODO: Move to message service or slack service 
    // Failed to subscribe as project, Handle as dataset
    console.warn('Failed to subscribe to Project or Dataset : ', error.message)
    await sendSlackMessage(
      responseUrl,
      `Failed to subscribe to *${id}*. Please make sure to subscribe using a valid dataset or project URL.`,
    )
  }
}

// Subscribe to a DW account
const subscribeToAccount = async (
  userid,
  channelid,
  id,
  responseUrl,
  token,
) => {
  try {
    // check if same user has an existing / active subscription for this resource in DW
    const existsInDW = await dataworld.verifySubscriptionExists(
      id,
      token,
      false,
    )
    
    if (!existsInDW) {
      await dataworld.subscribeToAccount(id, token)
    }

    const channelSubscription = await Subscription.findOne({
      where: { resourceId: id, channelId: channelid },
    })

    // If dw subscription was not found and subscription exists locally (Most likely cos user revoked access)
    // Then update existing local record in this channel to correctly link to the new dw subscription
    if (!existsInDW && channelSubscription) {
      await channelSubscription.update(
        { slackUserId: userid },
        { fields: ['slackUserId'] },
      )
    }

    // This `response.data.user` check will help ensure the appropiate message is sent to Slack in situations where
    // The subscription already exist locally in DB but not on DW api side, which means it wouldn't have showed up in a /data.world list command in channel.
    let message =
      !existsInDW || !channelSubscription
        ? `All set! You'll now receive notifications about *${id}* here.`
        : 'Subscription already exists in this channel. No further action required!';

    if (!channelSubscription) {
      addSubscriptionRecord(
        null,
        id,
        userid,
        channelid,
      )
    }

    // send subscription status message to Slack
    sendSlackMessage(responseUrl, message)
  } catch (error) {
    console.error('Error subscribing to account: ', error.message)
    sendSlackMessage(
      responseUrl,
      `Failed to subscribe to *${id}*. Is that a valid data.world account ID?`,
    )
  }
}

const unsubscribeFromDatasetOrProject = async (
  channelid,
  owner, 
  id,
  responseUrl,
) => {
  let token
  try {
    const resourceId = `${owner}/${id}`
    const [
      hasSubscriptionInChannel,
      removeDWSubscription,
    ] = await helper.getSubscriptionStatus(resourceId, channelid)

    // If subscription belongs to channel and the actor(user), then go ahead and unsubscribe
    if (hasSubscriptionInChannel) {
      const channelSubscription = await Subscription.findOne({
        where: {
          resourceId: `${owner}/${id}`,
          channelId: channelid,
        },
      })

      const user = await User.findOne({
        where: { slackId: channelSubscription.slackUserId },
      })

      token = user.dwAccessToken

      // will be true if user subscribed to this resource in one channel
      if (removeDWSubscription) {
        // use dataworld wrapper to unsubscribe from dataset
        await dataworld.unsubscribeFromDataset(
          owner,
          id,
          token,
        )
      }

      // remove subscription from DB.
      await removeSubscriptionRecord(
        owner,
        id,
        channelid,
      )
      // send successful unsubscription message to Slack
      const message = `No problem! You'll no longer receive notifications about *${id}* here.`
      await sendSlackMessage(responseUrl, message)
    } else {
      await sendSlackMessage(
        responseUrl,
        `No subscription found for *${resourceId}* here. Use \`/${commandText} list\` to list all active subscriptions.`,
      )
      return
    }
  } catch (error) {
    console.warn('Failed to unsubscribe from dataset : ', error.message)
    // Handle as project
    await unsubscribeFromProject(channelid, id, owner, responseUrl, token)
  }
}

const unsubscribeFromProject = async (
  channelId,
  id,
  owner,
  responseUrl,
  token,
) => {
  // use dataworld wrapper to unsubscribe to project
  try {
    const resourceId = `${owner}/${id}`
    const [
      hasSubscriptionInChannel,
      removeDWSubscription,
    ] = await helper.getSubscriptionStatus(resourceId, channelId)

    if (removeDWSubscription) {
      await dataworld.unsubscribeFromProject(
        owner,
        id,
        token,
      )
    }

    await removeSubscriptionRecord(
      owner,
      id,
      channelId,
    )
    // send successful unsubscription message to Slack
    await sendSlackMessage(
      responseUrl,
      `No problem! You'll no longer receive notifications about *${id}* here.`,
    )
  } catch (error) {
    console.error('Error unsubscribing from project : ', error.message)
    await sendSlackMessage(
      responseUrl,
      `Failed to unsubscribe from *${id}*.`,
    )
  }
}

const unsubscribeFromAccount = async (channelid, id, responseUrl) => {
  const commandText = process.env.SLASH_COMMAND

  // use dataworld wrapper to unsubscribe to account
  let resourceId = `${id}`
  const [
    hasSubscriptionInChannel,
    removeDWSubscription,
  ] = await helper.getSubscriptionStatus(resourceId, channelid)
  if (hasSubscriptionInChannel) {
    try {
      const channelSubscription = await Subscription.findOne({
        where: {
          resourceId,
          channelId: channelid,
        },
      })

      const user = await User.findOne({
        where: { slackId: channelSubscription.slackUserId },
      })

      if (removeDWSubscription) {
        await dataworld.unsubscribeFromAccount(
          id,
          user.dwAccessToken,
        )
      }
      await removeSubscriptionRecord(
        null,
        id,
        channelid,
      )
      // send successful unsubscription message to Slack
      const message = `No problem! You'll no longer receive notifications about *${id}* here.`
      await sendSlackMessage(responseUrl, message)
    } catch (error) {
      console.error('Error unsubscribing from account : ', error.message)
      await sendSlackMessage(
        responseUrl,
        `Failed to unsubscribe from *${id}*.`,
      )
    }
  } else {
    sendSlackMessage(
      responseUrl,
      `No subscription found for *${resourceId}* here. Use \`/${commandText} list\` to list all active subscriptions.`,
    )
    return
  }
}

const listSubscription = async (
  responseUrl,
  channelid,
  replaceOriginal,
  deleteOriginal,
) => {
  try {
    //Get all subscriptions in this channel
    const subscriptions = await Subscription.findAll({
      where: { channelId: channelid },
    })

    let message
    let blocks
    let options = []
    let baseUrl = `https://${dwDomain}`

    if (!lang.isEmpty(subscriptions)) {
      message = '*Active Subscriptions*'
      let blockText = ''
      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            const user = await User.findOne({
              where: { slackId: subscription.slackUserId },
            })

            let isProject = false
            if (subscription.resourceId.includes('/')) {
              const data = subscription.resourceId.split('/')
              const id = data.pop()
              const owner = data.pop()

              const response = await dataworld.getDataset(
                id,
                owner,
                user.dwAccessToken,
              )
              const dataset = response.data
              isProject = dataset.isProject
            }

            // Verify that subscription exists in DW, if not remove subscription from our DB
            const existsInDW = await dataworld.verifySubscriptionExists(
              subscription.resourceId,
              user.dwAccessToken,
              isProject,
            )
            if (existsInDW) {
              options.push({
                text: {
                  type: 'plain_text',
                  text: subscription.resourceId,
                },
                value: subscription.resourceId,
              })
              blockText += `• ${baseUrl}/${subscription.resourceId} \n *created by :* <@${subscription.slackUserId}> \n`
            }
          } catch (error) {
            // This is expected to fail if the dataset is a private dataset
            console.warn(
              `Failed to retrieve dataset or project : ${subscription.resourceId}`,
              error,
            )
          }
        }),
      )

      // check if we have valid subscriptions i.e subscriptions that exists in DB and DW
      if (lang.isEmpty(options) && lang.isEmpty(attachmentText)) {
        message = deleteOriginal
          ? ''
          : `No subscription found. Use \`\/${commandText} help\` to learn how to subscribe.`
      }

      blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Active Subscriptions*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: blockText,
          },
        },
        {
          type: 'actions',
          block_id: 'subscription_list',
          elements: [
            {
              type: 'static_select',
              placeholder: {
                type: 'plain_text',
                text: 'Unsubscribe from...',
              },
              action_id: 'unsubscribe_menu',
              options: options,
              confirm: {
                title: {
                  type: 'plain_text',
                  text: 'Confirm',
                },
                text: {
                  type: 'mrkdwn',
                  text:
                    'Are you sure you want to unsubscribe from selected resource ?',
                },
                confirm: {
                  type: 'plain_text',
                  text: 'Yes',
                },
                deny: {
                  type: 'plain_text',
                  text: 'No',
                },
              },
            },
          ],
        },
      ]
    } else {
      const commandText = process.env.SLASH_COMMAND
      // when updating previous list of subscriptions, remove message completely if there no more subscriptions.
      message = deleteOriginal
        ? ''
        : `No subscription found. Use \`\/${commandText} help\` to learn how to subscribe.`
    }
    await sendSlackMessage(
      responseUrl,
      message,
      blocks,
      replaceOriginal,
      deleteOriginal,
    )
  } catch (error) {
    console.error('Error getting subscriptions : ', error.message)
    await sendSlackMessage(responseUrl, 'Failed to get subscriptions.')
  }
}

const addSubscriptionRecord = async (owner, id, userId, channelId) => {
  // create subscription
  let resourceId = owner ? `${owner}/${id}` : `${id}`
  const [subscription, created] = await Subscription.findOrCreate({
    where: { resourceId: resourceId, channelId: channelId },
    defaults: { slackUserId: userId },
  })
  if (!created) {
    // Subscription record already exits.
    console.warn('Subscription record already exists : ', subscription)
  }
}

const removeSubscriptionRecord = async (owner, id, channelId) => {
  // delete subscription
  const resourceId = owner ? `${owner}/${id}` : `${id}`
  await Subscription.destroy({
    where: { resourceId: resourceId, channelId: channelId },
  })
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

// Visible for testing
module.exports = {
  subscribeToProjectOrDataset,
  subscribeToAccount,
  unsubscribeFromDatasetOrProject,
  unsubscribeFromProject,
  unsubscribeFromAccount,
  listSubscription,
  addSubscriptionRecord,
  removeSubscriptionRecord,
  sendSlackMessage,
  sendSlackBlock,
  sendSlackBlocks,
}
