const requestCommands = require('../request')
const dataworld = require('../../../api/dataworld')
const slack = require('../../../api/slack')
const requestsHelpers = require('../../../helpers/requests')
const tokensHelpers = require('../../../helpers/tokens')
const fixtures = require('../../../jest/fixtures')

jest.mock('../../../api/dataworld')
jest.mock('../../../api/slack')
jest.mock('../../../helpers/tokens')

afterEach(() => {
  jest.clearAllMocks()
})

describe('Test request command methods', () => {
  describe('handleDatasetRequestAction', async () => {
    let defaultArguments
    const botToken = 'botAccessToken'
    const dwAccessToken = 'dwAccessToken'
    const blockid = 'blockid'
    const channelid = 'channelid'
    const responseUrl = 'responseUrl'
    const triggerid = 'triggerid'
    const userid = 'userid'
    const requestid = 'requestid'
    const agentid = 'agentid'
    const datasetid = 'datasetid'

    beforeEach(() => {
      defaultArguments = {
        channelid,
        userid,
        triggerid,
        responseUrl,
        message: fixtures.datasetRequestWebhookMessage('accept'),
        blockid,
        actionid: requestsHelpers.AUTHORIZATION_ACTIONS.ACCEPT,
        requestid,
        agentid,
        datasetid,
        dwAccessToken
      }
    })

    it('should accept a dataset request and update the message', async () => {
      defaultArguments.message = fixtures.datasetRequestWebhookMessage('accept')
      defaultArguments.actionid = requestsHelpers.AUTHORIZATION_ACTIONS.ACCEPT

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(dataworld.acceptDatasetRequest).toHaveBeenCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledTimes(1)
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
        responseUrl,
        "",
        expect.anything(),
        true
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponseMessageAndBlocks.mock.calls[0][2]).toMatchSnapshot()
    })

    it('should reject a dataset request and update the message', async () => {
      defaultArguments.message = fixtures.datasetRequestWebhookMessage('reject')
      defaultArguments.actionid = requestsHelpers.AUTHORIZATION_ACTIONS.REJECT

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(dataworld.rejectDatasetRequest).toHaveBeenCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledTimes(1)
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
        responseUrl,
        "",
        expect.anything(),
        true
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponseMessageAndBlocks.mock.calls[0][2]).toMatchSnapshot()
    })

    it('should cancel a dataset request and update the message', async () => {
      defaultArguments.message = fixtures.datasetRequestWebhookMessage('cancel')
      defaultArguments.actionid = requestsHelpers.AUTHORIZATION_ACTIONS.CANCEL

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(dataworld.cancelDatasetRequest).toHaveBeenCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledTimes(1)
      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
        responseUrl,
        "",
        expect.anything(),
        true
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponseMessageAndBlocks.mock.calls[0][2]).toMatchSnapshot()
    })

    it('should handle unauthorized users', async () => {
      dataworld.acceptDatasetRequest.mockImplementation(() =>
        Promise.reject({ response: { status: 403 }})
      )
      tokensHelpers.getBotAccessTokenForChannel.mockImplementation(() =>
        Promise.resolve({ botToken })
      )

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(slack.sendResponseMessageAndBlocks).not.toHaveBeenCalled()
      expect(slack.openView).toHaveBeenCalledTimes(1)
      expect(slack.openView).toHaveBeenCalledWith(
        botToken,
        triggerid,
        expect.anything()
      )
      // check that modalView is formatted correctly
      expect(slack.openView.mock.calls[0][2]).toMatchSnapshot()
    })

    it('should handle generic errors in acting on a dw request', async () => {
      dataworld.acceptDatasetRequest.mockImplementation(() =>
        Promise.reject({ response: { status: 400 }})
      )
      tokensHelpers.getBotAccessTokenForChannel.mockImplementation(() =>
        Promise.resolve({botToken})
      )

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(slack.sendResponseMessageAndBlocks).not.toHaveBeenCalled()
      expect(slack.openView).toHaveBeenCalledTimes(1)
      expect(slack.openView).toHaveBeenCalledWith(
        botToken,
        triggerid,
        expect.anything()
      )
      // check that modalView is formatted correctly
      expect(slack.openView.mock.calls[0][2]).toMatchSnapshot()
    })
  })
})
