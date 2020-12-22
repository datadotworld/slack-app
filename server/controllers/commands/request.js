const dataworld = require('../../api/dataworld')
const slack = require('../../api/slack')
const { InvalidCaseError } = require('../../helpers/errors')
const { AUTHORIZATION_ACTIONS } = require('../../helpers/requests')
const { getBotAccessTokenForChannel } = require('../../helpers/tokens')

const openNotificationModal = async (channelId, triggerId, message) => {
  const token = await getBotAccessTokenForChannel(channelId)
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

const updateMessageBlocksWithAction = (messageBlocks, userId, action) => {
  // Currently there is only section with type 'actions' in the message format
  const buttonsIndex = messageBlocks.findIndex(block => block.type === 'actions')
  messageBlocks[buttonsIndex] = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Request ${action} by <@${userId}>*`
    }
  }
  return messageBlocks
}

const getOriginalMessage = async (channelId, messageTs) => {
  const token = await getBotAccessTokenForChannel(channelId)
  return slack.getMessage(token, channelId, messageTs)
}

const handleDatasetRequestAction = async ({
  channelId,
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
  let action
  try {
    switch (actionid) {
      case AUTHORIZATION_ACTIONS.ACCEPT:
        await dataworld.acceptDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        action = 'approved'
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
        channelId,
        triggerId,
        'You are not authorized to manage this request.'
      )
    } else {
      openNotificationModal(
        channelId,
        triggerId,
        'Could not successfully manage this request. Try viewing the request on <https://data.world|data.world>.'
      )
    }
    return
  }

  // Update original message to indicate action completed
  const message = await getOriginalMessage(channelId, messageTs)
  const updatedBlocks = updateMessageBlocksWithAction(message.blocks, userId, action)
  slack.sendResponse(responseUrl, {
    replace_original: true,
    blocks: updatedBlocks
  })
}

module.exports = {
  handleDatasetRequestAction
}
