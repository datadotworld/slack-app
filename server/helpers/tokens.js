const Team = require('../models').Team
const Channel = require('../models').Channel

const getBotAccessTokenForChannel = async (channelId) => {
  const channel = await Channel.findOne({ where: { channelId: channelId } })
  return getBotAccessTokenForTeam(channel.teamId)
}

const getBotAccessTokenForTeam = async (teamId) => {
  const team = await Team.findOne({ where: { teamId: teamId } })
  const botToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken
  const teamAccessToken = process.env.SLACK_TEAM_TOKEN || team.teamAccessToken

  return {
    botToken,
    teamAccessToken
  }
}

module.exports = {
  getBotAccessTokenForChannel,
  getBotAccessTokenForTeam
}
