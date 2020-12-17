/**
This module is largely copied from the notifications repo. Until we figure out
a way to share code between the two repos, we should make sure that changes in
this module are applied to both files.
*/

const { InvalidCaseError } = require('./errors')
const {
  getOriginFromUrl,
  getWebAgentLink,
  getWebDatasetLink
} = require('./links')

const DATASET_AUTHORIZATION_TYPES = {
  CREATED: 'dataset.authorization.created',
  DELETED: 'dataset.authorization.deleted',
  REQUEST_CREATED: 'dataset.authorization_request.created',
  REQUEST_CANCELLED: 'dataset.authorization_request.cancelled',
  REQUEST_APPROVED: 'dataset.authorization_request.approved',
  REQUEST_REJECTED: 'dataset.authorization_request.rejected',
  INVITE_CREATED: 'dataset.authorization_invite.created',
  INVITE_CANCELLED: 'dataset.authorization_invite.cancelled',
  INVITE_APPROVED: 'dataset.authorization_invite.approved',
  INVITE_REJECTED: 'dataset.authorization_invite.rejected'
}

const CONTRIBUTION_REQUEST_TYPES = {
  CATALOG_CONTRIBUTE_CREATED: 'catalog.contribute_request.created',
  CATALOG_CONTRIBUTE_CANCELLED: 'catalog.contribute_request.cancelled',
  CATALOG_CONTRIBUTE_APPROVED: 'catalog.contribute_request.approved',
  CATALOG_TRANSFER_CREATED: 'catalog.transfer_request.created',
  CATALOG_TRANSFER_CANCELLED: 'catalog.transfer_request.cancelled',
  CATALOG_TRANSFER_APPROVED: 'catalog.transfer_request.approved',
  DATASET_CONTRIBUTE_CREATED: 'dataset.contribute_request.created',
  DATASET_CONTRIBUTE_CANCELLED: 'dataset.contribute_request.cancelled',
  DATASET_CONTRIBUTE_APPROVED: 'dataset.contribute_request.approved'
}

const AUTHORIZATION_ACTIONS = {
  ACCEPT: 'authorization_request.accept',
  CANCEL: 'authorization_request.cancel',
  REJECT: 'authorization_request.reject'
}

function formatLink(text, url) {
  return `<${url}|${text}>`
}

function getExtraDetailsText({
  header,
  object,
  headerLink
}) {
  const linkedHeader = headerLink
    ? `*${formatLink(header, headerLink)}*\n`
    : `*${header}*\n`
  return Object.entries(object).reduce(
    (text, [key, val]) => (val ? text + `*${key}*: _${val}_\n` : text),
    linkedHeader
  )
}

function getAuthLevelCopyText(authorizationLevel) {
  switch (authorizationLevel) {
    case 'DISCOVER':
      return 'discover'
    case 'READ':
      return 'view'
    case 'WRITE':
      return 'edit'
    case 'ADMIN':
      return 'manage'
    default:
      throw new InvalidCaseError(authorizationLevel)
  }
}

function getDatasetAccessCopyText(
  authorizationLevel,
  dataset
) {
  return `_${getAuthLevelCopyText(authorizationLevel)}_ access to _${dataset}_`
}

function hasNonEmptyProperties(object) {
  return Object.values(object).some(val => val)
}

function getAuthorizationSummaryText(eventBody) {
  // The origin is retrieved from the event body to build out URLs throughout
  // this module. We are making an assumption that the origins should match
  // between the event body URLs and the URLs we construct in the Slack
  // message.
  const origin = getOriginFromUrl(eventBody.resourceUrl)

  const grantee =
    eventBody.granteeType === 'EMAIL'
      ? formatLink(eventBody.granteeEmail, `mailto:${eventBody.granteeEmail}`)
      : formatLink(eventBody.granteeName, getWebAgentLink(origin, eventBody.granteeId))
  const dataset = formatLink(
    eventBody.resourceName,
    getWebDatasetLink(origin, eventBody.resourceOwner, eventBody.resourceId)
  )
  const actor = formatLink(
    eventBody.actorName,
    getWebAgentLink(origin, eventBody.actorId)
  )

  switch (eventBody.eventType) {
    case DATASET_AUTHORIZATION_TYPES.CREATED:
      return `_${grantee}_ has been granted ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )} by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.DELETED:
      return `_${grantee}_'s access to _${dataset}_ has been removed by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.REQUEST_CREATED:
      return `_${grantee}_ has requested ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )}`
    case DATASET_AUTHORIZATION_TYPES.REQUEST_CANCELLED:
      return `_${grantee}_ has cancelled their request for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )}`
    case DATASET_AUTHORIZATION_TYPES.REQUEST_REJECTED:
      return `_${grantee}_'s request for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )} has been rejected by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.REQUEST_APPROVED:
      return `_${grantee}_'s request for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )} has been approved by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.INVITE_CREATED:
      return `_${grantee}_ has been invited to have ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )} by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.INVITE_CANCELLED:
      return `_${grantee}_'s invite for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )} has been cancelled by _${actor}_`
    case DATASET_AUTHORIZATION_TYPES.INVITE_REJECTED:
      return `_${grantee}_ has declined their invitation for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )}`
    case DATASET_AUTHORIZATION_TYPES.INVITE_APPROVED:
      return `_${grantee}_ has accepted their invitation for ${getDatasetAccessCopyText(
        eventBody.authorizationLevel,
        dataset
      )}`
    default:
      throw new InvalidCaseError(eventBody)
  }
}

function getContributionSummaryText(eventBody) {
  const origin = getOriginFromUrl(eventBody.requester.url)

  const requester = formatLink(
    eventBody.requester.displayName,
    eventBody.requester.url
  )
  const resource = formatLink(eventBody.resource.name, eventBody.resource.url)
  const actor = formatLink(
    eventBody.actor.displayName,
    getWebAgentLink(origin, eventBody.actor.agentid)
  )
  switch (eventBody.eventType) {
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_CONTRIBUTE_CREATED:
    case CONTRIBUTION_REQUEST_TYPES.DATASET_CONTRIBUTE_CREATED:
      return `_${requester}_ has suggested changes to _${resource}_`
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_CONTRIBUTE_CANCELLED:
    case CONTRIBUTION_REQUEST_TYPES.DATASET_CONTRIBUTE_CANCELLED:
      return `_${requester}_ has removed their suggestions to _${resource}_`
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_CONTRIBUTE_APPROVED:
    case CONTRIBUTION_REQUEST_TYPES.DATASET_CONTRIBUTE_APPROVED:
      return `_${requester}_'s suggestions to _${resource}_ have been approved by _${actor}_`
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_TRANSFER_CREATED:
      return `_${requester}_ has requested to publish _${resource}_`
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_TRANSFER_CANCELLED:
      return `_${requester}_ has cancelled their request to publish _${resource}_`
    case CONTRIBUTION_REQUEST_TYPES.CATALOG_TRANSFER_APPROVED:
      return `_${requester}_'s request to publish _${resource}_ has been approved by _${actor}_`
    default:
      throw new InvalidCaseError(eventBody)
  }
}

function getRequestFormFieldsText(requestFormFields) {
  return Object.entries(requestFormFields).reduce((text, [key, val]) => {
    if (key === 'I am an existing VDAS user') {
      val = val === 'Checked' ? 'Yes' : 'No'
    }
    return val ? text + `>*${key}*:\n>_${val}_\n` : text
  }, '*Request Details*\n')
}

function getAcceptAndRejectButtons(
  acceptActionId,
  rejectActionId,
  data
) {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Approve'
        },
        style: 'primary',
        action_id: acceptActionId,
        value: JSON.stringify(data)
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Reject'
        },
        style: 'danger',
        action_id: rejectActionId,
        value: JSON.stringify(data)
      },
    ]
  }
}

function getCancelButton(cancelActionId, data) {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Cancel'
        },
        style: 'danger',
        action_id: cancelActionId,
        value: JSON.stringify(data)
      }
    ]
  }
}

function getAuthorizationRequestSlackBlocks(eventBody) {
  const {
    resourceId,
    resourceName,
    resourceOwner,
    resourceOwnerName,
    resourceUrl
  } = eventBody

  const origin = getOriginFromUrl(resourceUrl)

  const detailsBlocks = [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📍 ${resourceOwnerName}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: getAuthorizationSummaryText(eventBody)
      }
    }
  ]

  if (
    eventBody.eventType === DATASET_AUTHORIZATION_TYPES.REQUEST_CREATED ||
    eventBody.eventType === DATASET_AUTHORIZATION_TYPES.INVITE_CREATED
  ) {
    if (hasNonEmptyProperties(eventBody.requestFormFields)) {
      detailsBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: getRequestFormFieldsText(eventBody.requestFormFields)
        }
      })
    }
    if (eventBody.eventType === DATASET_AUTHORIZATION_TYPES.REQUEST_CREATED) {
      detailsBlocks.push(
        getAcceptAndRejectButtons(
          AUTHORIZATION_ACTIONS.ACCEPT,
          AUTHORIZATION_ACTIONS.REJECT,
          {
            requestid: eventBody.requestId,
            agentid: resourceOwner,
            datasetid: resourceId
          }
        )
      )
    } else {
      detailsBlocks.push(
        getCancelButton(
          AUTHORIZATION_ACTIONS.CANCEL,
          {
            requestid: eventBody.requestId,
            agentid: resourceOwner,
            datasetid: resourceId
          }
        )
      )
    }
  }

  const extrasBlocks = [
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text:
            eventBody.granteeType === 'EMAIL'
              ? `*${formatLink(
                  eventBody.granteeEmail,
                  `mailto:${eventBody.granteeEmail}`
                )}*\n_User doesn't have a data.world account yet_`
              : getExtraDetailsText({
                  header: eventBody.granteeName,
                  object: {
                    [eventBody.granteeType === 'USER'
                      ? 'User ID'
                      : 'Organization ID']: eventBody.granteeId,
                    'E-mail': eventBody.granteeEmail
                  },
                  headerLink: getWebAgentLink(origin, eventBody.granteeId)
                })
        },
        {
          type: 'mrkdwn',
          text: getExtraDetailsText({
            header: resourceName,
            object: {
              'Resource ID': resourceId,
              'Owner ID': resourceOwner
            },
            headerLink: getWebDatasetLink(origin, resourceOwner, resourceId)
          })
        }
      ]
    }
  ]

  return [
    ...detailsBlocks,
    { type: 'divider' },
    ...extrasBlocks,
    { type: 'divider' }
  ]
}

function getContributionRequestSlackBlocks(eventBody) {
  const { org, requester, resource } = eventBody

  const detailsBlocks = [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📍 ${org.displayName}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: getContributionSummaryText(eventBody)
      }
    }
  ]

  if (
    eventBody.eventType ===
      CONTRIBUTION_REQUEST_TYPES.CATALOG_TRANSFER_CREATED ||
    eventBody.eventType ===
      CONTRIBUTION_REQUEST_TYPES.CATALOG_CONTRIBUTE_CREATED ||
    eventBody.eventType ===
      CONTRIBUTION_REQUEST_TYPES.DATASET_CONTRIBUTE_CREATED
  ) {
    if (eventBody.message) {
      detailsBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: getRequestFormFieldsText({ Message: eventBody.message })
        }
      })
    }
    detailsBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${formatLink(
          'Manage this request →',
          eventBody.resource.approvalUrl
        )}*`
      }
    })
  }

  const extrasBlock = [
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: getExtraDetailsText({
            header: requester.displayName,
            object: { 'User ID': requester.agentid, 'E-mail': requester.email },
            headerLink: requester.url
          })
        },
        {
          type: 'mrkdwn',
          text: getExtraDetailsText({
            header: resource.name,
            object: {
              'Resource Type': resource.type
            },
            headerLink: resource.url
          })
        }
      ]
    }
  ]

  return [
    ...detailsBlocks,
    { type: 'divider' },
    ...extrasBlock,
    { type: 'divider' }
  ]
}

module.exports = {
  AUTHORIZATION_ACTIONS,
  DATASET_AUTHORIZATION_TYPES,
  CONTRIBUTION_REQUEST_TYPES,
  getAuthorizationRequestSlackBlocks,
  getContributionRequestSlackBlocks
}
