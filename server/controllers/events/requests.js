const slack = require('../../api/slack')
const {
  getAuthorizationRequestSlackBlocks,
  getContributionRequestSlackBlocks
} = require('../../helpers/requests')

const Team = require('../../models').Team
const Channel = require('../../models').Channel

const sendEventToSlack = async (channelIds, blocks) => {
  // TODO: make helper for getting token
  for (const channelId of channelIds) {
    console.log({ channelId })
    const channel = await Channel.findOne({ where: { channelId: channelId } });
    const teamId = channel.teamId
    const team = await Team.findOne({ where: { teamId: teamId } });
    const token = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
    slack.sendMessageWithBlocks(token, channelId, blocks)
  }
}

const handleAuthorizationRequest = async (body, channelIds) => {
  const blocks = getAuthorizationRequestSlackBlocks(body)
  await sendEventToSlack(channelIds, blocks)
}

const handleContributionRequest = async (body, channelIds) => {
  const blocks = getContributionRequestSlackBlocks(body)
  await sendEventToSlack(channelIds, blocks)
}

module.exports = {
  handleAuthorizationRequest,
  handleContributionRequest
}
