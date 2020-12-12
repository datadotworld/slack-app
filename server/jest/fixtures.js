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

module.exports = {
  authorizationRequestCreatedEventBody,
  authorizationRequestCancelledEventBody,
  contributionRequestCreatedEventBody,
  contributionRequestCancelledEventBody
}
