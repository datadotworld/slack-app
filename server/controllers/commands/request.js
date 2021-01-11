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

const updateMessageBlocksWithAction = (messageBlocks, blockId, userId, action) => {
  const buttonsIndex = messageBlocks.findIndex(block => block.block_id === blockId)
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
  channelid,
  userid,
  triggerid,
  responseUrl,
  message,
  blockid,
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
      await openNotificationModal(
        channelid,
        triggerid,
        'You are not authorized to manage this request.'
      )
    } else {
      await openNotificationModal(
        channelid,
        triggerid,
        'Could not successfully manage this request. Try viewing the request on <https://data.world|data.world>.'
      )
    }
    return
  }

  // Update original message to indicate action completed
  const updatedBlocks = updateMessageBlocksWithAction(
    message.blocks,
    blockid,
    userid,
    action
  )
  slack.sendResponse(responseUrl, {
    replace_original: true,
    blocks: updatedBlocks
  })
}

module.exports = {
  handleDatasetRequestAction
}
