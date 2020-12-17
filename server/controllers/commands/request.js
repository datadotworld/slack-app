const dataworld = require('../../api/dataworld')
const slack = require('../../api/slack')
const { InvalidCaseError } = require('../../helpers/errors')
const { AUTHORIZATION_ACTIONS } = require('../../helpers/requests')
const { getBotAccessTokenForTeam } = require('../../helpers/tokens')

const openNotificationModal = async (triggerId, teamId, message) => {
  const token = await getBotAccessTokenForTeam(teamId)
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

const handleDatasetRequestAction = async ({
  teamId,
  triggerId,
  actionid,
  requestid,
  agentid,
  datasetid,
  dwAccessToken
}) => {
  try {
    switch (actionid) {
      case AUTHORIZATION_ACTIONS.ACCEPT:
        await dataworld.acceptDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        break
      case AUTHORIZATION_ACTIONS.REJECT:
        await dataworld.rejectDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        break
      case AUTHORIZATION_ACTIONS.CANCEL:
        await dataworld.cancelDatasetRequest(dwAccessToken, requestid, agentid, datasetid)
        break
      default:
        throw new InvalidCaseError(actionid)
    }
  } catch (error) {
    if (error.response.status === 403) {
      openNotificationModal(
        triggerId,
        teamId,
        'You are not authorized to manage this request.'
      )
    } else {
      openNotificationModal(
        triggerId,
        teamId,
        'Could not successfully manage this request. Try viewing the request on <https://data.world|data.world>.'
      )
    }
    return
  }
  // TODO: update existing slack message
}

module.exports = {
  handleDatasetRequestAction
}
