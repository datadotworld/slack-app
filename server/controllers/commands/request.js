const dataworld = require('../../api/dataworld')
const slack = require('../../api/slack')
const { InvalidCaseError } = require('../../helpers/errors')
const { AUTHORIZATION_ACTIONS } = require('../../helpers/requests')
const { getBotAccessTokenForTeam } = require('../../helpers/tokens')

const openNotificationModal = async (token, triggerId, message) => {
  const modalView = {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: 'Something went wrong 😞'
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ]
  }
  slack.openView(token, triggerId, modalView)
}

const updateRequestBlocksWithAction = (messageBlocks, userId, action) => {
  const buttonsIndex = messageBlocks.findIndex(block => block.type === 'actions')
  console.log({ buttonsIndex })
  messageBlocks[buttonsIndex] = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Request ${action} by <@${userId}>*`
    }
  }
  return messageBlocks
}

const handleDatasetRequestAction = async ({
  channelId,
  teamId,
  userId,
  triggerId,
  responseUrl,
  messageTs,
  actionid,
  requestid,
  agentid,
  datasetid,
  dwAccessToken
}) => {
  // const token = await getBotAccessTokenForTeam(teamId)
  const Team = require('../../models').Team
  const team = await Team.findOne({ where: { teamId }})
  const token = team.accessToken
  console.log({ token })
  let action
  try {
    switch (actionid) {
      case AUTHORIZATION_ACTIONS.ACCEPT:
        await dataworld.acceptDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        action = 'accepted'
        break
      case AUTHORIZATION_ACTIONS.REJECT:
        await dataworld.rejectDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        action = 'rejected'
        break
      case AUTHORIZATION_ACTIONS.CANCEL:
        await dataworld.cancelDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        action = 'cancelled'
        break
      default:
        throw new InvalidCaseError(actionid)
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      openNotificationModal(
        token,
        triggerId,
        'You are not authorized to manage this request.'
      )
    } else {
      openNotificationModal(
        token,
        triggerId,
        'Could not successfully manage this request. Try viewing the request on <https://data.world|data.world>.'
      )
    }
    return
  }
  // TODO: update message, add conversation history scope
  const message = await slack.getMessage(token, channelId, messageTs)
  console.log(message.blocks)
  const updatedBlocks = updateRequestBlocksWithAction(message.blocks, userId, action)
  console.log(updatedBlocks)
  slack.sendResponse(responseUrl, {
    replace_original: true,
    blocks: updatedBlocks
  })
  // slack.updateMessageWithBlocks(token, channelId, messageTs, updatedBlocks)
}

module.exports = {
  handleDatasetRequestAction
}
