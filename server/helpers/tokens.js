const Team = require('../models').Team
const Channel = require('../models').Channel

const getBotAccessTokenForChannel = async (channelId) => {
  const channel = await Channel.findOne({ where: { channelId: channelId } })
  return getBotAccessTokenForTeam(channel.teamId)
}

const getBotAccessTokenForTeam = async (teamId) => {
  const team = await Team.findOne({ where: { teamId: teamId } })
  const token = process.env.SLACK_BOT_TOKEN || team.botAccessToken
  return token
}

module.exports = {
  getBotAccessTokenForChannel,
  getBotAccessTokenForTeam
}
