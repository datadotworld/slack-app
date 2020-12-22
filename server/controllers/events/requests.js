const collection = require("lodash/collection");

const slack = require('../../api/slack')
const {
  getAuthorizationRequestSlackBlocks,
  getContributionRequestSlackBlocks
} = require('../../helpers/requests')
const { getBotAccessTokenForChannel } = require('../../helpers/tokens')

const sendRequestEventToSlack = async (channelIds, blocks) => {
  await Promise.all(channelIds.map(async (channelId) => {
    const token = await getBotAccessTokenForChannel(channelId)
    await slack.sendMessageWithBlocks(token, channelId, blocks)
  }))
}

const handleAuthorizationRequest = async (body, channelIds) => {
  const blocks = getAuthorizationRequestSlackBlocks(body)
  await sendRequestEventToSlack(channelIds, blocks)
}

const handleContributionRequest = async (body, channelIds) => {
  const blocks = getContributionRequestSlackBlocks(body)
  await sendRequestEventToSlack(channelIds, blocks)
}

module.exports = {
  handleAuthorizationRequest,
  handleContributionRequest
}
