const authorizationRequestCreatedEventBody = {
  actorId: 'patrick',
  actorName: 'Patrick Star',
  granteeType: 'USER',
  granteeEmail: 'patrick@star.com',
  granteeId: 'patrick',
  granteeName: 'Patrick Star',
  resourceId: 'use-case-discvoerable',
  resourceName: 'use-case-discvoerable',
  resourceOwner: 'use-case-org',
  resourceOwnerName: 'Use Case Org',
  resourceUrl:
   'https://ddw-corewebapp.dev.data.world/use-case-org/use-case-discvoerable',
  event:
   { triggeredBy: 'patrick',
     created: 'Thu, 10 Dec 2020 23:24:18 GMT' },
  eventType: 'dataset.authorization_request.created',
  authorizationLevel: 'READ',
  resourceAccessUrl:
   'https://ddw-corewebapp.dev.data.world/use-case-org/use-case-discvoerable/access',
  requestFormFields:
   { 'How long do you need access to this dataset?': '6 months',
     'Any additional notes or comments?': 'I need access.',
     'I am an existing VDAS user': 'Checked' },
  requestId: 'a997b017-75a5-4cbb-93b8-02f6242e9483'
}

const authorizationRequestCancelledEventBody = {
  actorId: 'patrick',
  actorName: 'Patrick Star',
  granteeType: 'USER',
  granteeEmail: 'patrick@star.com',
  granteeId: 'patrick',
  granteeName: 'Patrick Star',
  resourceId: 'use-case-discvoerable',
  resourceName: 'use-case-discvoerable',
  resourceOwner: 'use-case-org',
  resourceOwnerName: 'Use Case Org',
  resourceUrl:
   'https://ddw-corewebapp.dev.data.world/use-case-org/use-case-discvoerable',
  event:
   { triggeredBy: 'patrick',
     created: 'Fri, 11 Dec 2020 03:36:50 GMT' },
  eventType: 'dataset.authorization_request.cancelled',
  authorizationLevel: 'READ'
}

const authorizationInviteCancelledEventBody = {
  actorId: "user8888",
  actorName: "testing!",
  granteeType: "USER",
  granteeEmail: "patrick@star.com",
  granteeId: "patrick",
  granteeName: "Patrick Star",
  resourceId: "use-case-discvoerable",
  resourceName: "use-case-discvoerable",
  resourceOwner: "use-case-org",
  resourceOwnerName: "Use Case Org",
  resourceUrl: "http://localhost:3000/use-case-org/use-case-discvoerable",
  event: {
    triggeredBy: "user8888",
    created: "Sat, 12 Dec 2020 21:36:48 GMT"
  },
  eventType: "dataset.authorization_invite.created",
  authorizationLevel: "WRITE",
  resourceAccessUrl: "http://localhost:3000/use-case-org/use-case-discvoerable/access",
  requestFormFields: {
    message: ""
  },
  requestId: "5dee1394-5473-4329-aae2-f7bd46f5bfad"
}

const contributionRequestCreatedEventBody = {
  actor: { agentid: 'patrick', displayName: 'Patrick Star' },
  event:
   { created: 'Thu, 10 Dec 2020 23:29:44 GMT',
     triggeredBy: 'patrick' },
  org: { agentid: 'goo-lagoon', displayName: 'Goo Lagoon' },
  requester:
   { agentid: 'patrick',
     displayName: 'Patrick Star',
     email: 'patrick@star.com',
     url: 'http://localhost:3000/patrick' },
  resource:
   { url:
      'http://localhost:3000/goo-lagoon/catalog/item?uri=https%3A%2F%2Fgoo-lagoon.linked.data.world%2Fd%2Fddw-catalogs%2FbusinessTerm-52ab4c7d-8f88-33e3-b021-0277a37982ef',
     name: '12th test',
     type: 'Business term',
     approvalUrl:
      'http://localhost:3000/goo-lagoon/catalog/item/approvals?uri=https%3A%2F%2Fgoo-lagoon.linked.data.world%2Fd%2Fddw-catalogs%2FbusinessTerm-52ab4c7d-8f88-33e3-b021-0277a37982ef' },
  eventType: 'catalog.contribute_request.created',
  message: 'These are very good changes.',
  requestId: '21d7ca1c-afa0-4c72-bf9b-8ea03940234f'
}

const contributionRequestCancelledEventBody = {
  actor: { agentid: 'patrick', displayName: 'Patrick Star' },
  event:
   { created: 'Thu, 10 Dec 2020 23:29:42 GMT',
     triggeredBy: 'patrick' },
  org: { agentid: 'goo-lagoon', displayName: 'Goo Lagoon' },
  requester:
   { agentid: 'patrick',
     displayName: 'Patrick Star',
     email: 'patrick@star.com',
     url: 'http://localhost:3000/patrick' },
  resource:
   { url:
      'http://localhost:3000/goo-lagoon/catalog/item?uri=https%3A%2F%2Fgoo-lagoon.linked.data.world%2Fd%2Fddw-catalogs%2FbusinessTerm-52ab4c7d-8f88-33e3-b021-0277a37982ef',
     name: '12th test',
     type: 'Business term' },
  eventType: 'catalog.contribute_request.cancelled'
}

const datasetRequestWebhookMessage = (action) => ({
  bot_id: 'B01G1BDDF61',
  type: 'message',
  text: 'This content can\'t be displayed.',
  user: 'U01FXMWB84W',
  ts: '1608604853.004200',
  team: 'T01EYB10HFZ',
  blocks: [
    {
      type: 'context',
      block_id: '0e6Ul',
      elements: [ { type: 'mrkdwn', text: 'abcdedf' } ]
    },
    {
      type: 'section',
      block_id: 'HzJC',
      text: { type: 'mrkdwn', text: 'more text' }
    },
    {
      type: 'actions',
      block_id: 'blockid',
      elements: [{
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Reject'
        },
        style: 'primary',
        action_id: `authorization_request.${action}`,
        value: '{"requestid":"fe642b58-a4a0-4a68-83ba-91572bbae349","agentid":"use-case-org","datasetid":"use-case-discvoerable"}'
      }]
    },
    {
      type: 'divider',
      block_id: 'D8CN'
    }
  ]
})

const datasetRequestRejectedActionPayload = {
  type: 'block_actions',
  user:
   { id: 'U01G2U5SBGQ',
     username: 'daniel.peng',
     name: 'daniel.peng',
     team_id: 'T01EYB10HFZ' },
  api_app_id: 'A01G17SK2VB',
  token: 'p6kINd3ICTBD7nR4eIQLCHDu',
  container:
   { type: 'message',
     message_ts: '1608604853.004200',
     channel_id: 'C01F6BCHE5U',
     is_ephemeral: false },
  trigger_id:
   '1589244125189.1508375017543.cb6fc0be648a0c6fe91c6ee6f845dfdb',
  team: { id: 'T01EYB10HFZ', domain: 'second-slackbot-test' },
  enterprise: null,
  is_enterprise_install: false,
  channel: { id: 'C01F6BCHE5U', name: 'also-slackbot' },
  message: datasetRequestWebhookMessage('reject'),
  response_url:
   'https://hooks.slack.com/actions/T01EYB10HFZ/1577558403447/I5fDkDrCGA0zKp3dxa6XUbeJ',
  actions:
   [ { action_id: 'authorization_request.reject',
       block_id: 'blockid',
       text: 'sample text',
       value:
        '{"requestid":"fe642b58-a4a0-4a68-83ba-91572bbae349","agentid":"use-case-org","datasetid":"use-case-discvoerable"}',
       style: 'danger',
       type: 'button',
       action_ts: '1608604863.748298' } ]
}

module.exports = {
  authorizationRequestCreatedEventBody,
  authorizationRequestCancelledEventBody,
  authorizationInviteCancelledEventBody,
  contributionRequestCreatedEventBody,
  contributionRequestCancelledEventBody,
  datasetRequestRejectedActionPayload,
  datasetRequestWebhookMessage
}
