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
    const botAccessToken = 'botAccessToken'
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

      expect(dataworld.acceptDatasetRequest).toBeCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponse).toHaveBeenCalledTimes(1)
      expect(slack.sendResponse).toHaveBeenCalledWith(
        responseUrl,
        expect.objectContaining({ replace_original: true })
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponse.mock.calls[0][1].blocks).toMatchSnapshot()
    })

    it('should reject a dataset request and update the message', async () => {
      defaultArguments.message = fixtures.datasetRequestWebhookMessage('reject')
      defaultArguments.actionid = requestsHelpers.AUTHORIZATION_ACTIONS.REJECT

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(dataworld.rejectDatasetRequest).toBeCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponse).toHaveBeenCalledTimes(1)
      expect(slack.sendResponse).toHaveBeenCalledWith(
        responseUrl,
        expect.objectContaining({ replace_original: true })
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponse.mock.calls[0][1].blocks).toMatchSnapshot()
    })

    it('should cancel a dataset request and update the message', async () => {
      defaultArguments.message = fixtures.datasetRequestWebhookMessage('cancel')
      defaultArguments.actionid = requestsHelpers.AUTHORIZATION_ACTIONS.CANCEL

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(dataworld.cancelDatasetRequest).toBeCalledWith(
        dwAccessToken,
        requestid,
        agentid,
        datasetid
      )
      expect(slack.sendResponse).toHaveBeenCalledTimes(1)
      expect(slack.sendResponse).toHaveBeenCalledWith(
        responseUrl,
        expect.objectContaining({ replace_original: true })
      )
      // check that updated message is formatted correctly
      expect(slack.sendResponse.mock.calls[0][1].blocks).toMatchSnapshot()
    })

    it('should handle unauthorized users', async () => {
      dataworld.acceptDatasetRequest.mockImplementation(() =>
        Promise.reject({ response: { status: 403 }})
      )
      tokensHelpers.getBotAccessTokenForChannel.mockImplementation(() =>
        Promise.resolve(botAccessToken)
      )

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(slack.sendResponse).not.toHaveBeenCalled()
      expect(slack.openView).toHaveBeenCalledTimes(1)
      expect(slack.openView).toHaveBeenCalledWith(
        botAccessToken,
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
        Promise.resolve(botAccessToken)
      )

      await requestCommands.handleDatasetRequestAction(defaultArguments)

      expect(slack.sendResponse).not.toHaveBeenCalled()
      expect(slack.openView).toHaveBeenCalledTimes(1)
      expect(slack.openView).toHaveBeenCalledWith(
        botAccessToken,
        triggerid,
        expect.anything()
      )
      // check that modalView is formatted correctly
      expect(slack.openView.mock.calls[0][2]).toMatchSnapshot()
    })
  })
})
