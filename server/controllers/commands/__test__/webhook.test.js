const Channel = require('../../../models').Channel

const slack = require('../../../api/slack')
const webhookCommands = require('../webhook')
const webhookHelpers = require('../../../helpers/webhook')

jest.mock('../../../api/slack')

const buildWebhookUrlSpy = jest.spyOn(webhookHelpers, 'buildWebhookUrl')
const generateWebhookIdSpy = jest.spyOn(webhookHelpers, 'generateWebhookId')

afterEach(() => {
  jest.clearAllMocks()
})

describe('Test webhook command methods', () => {
  describe('getOrCreateWebhookForChannel', () => {
    const mockChannelId = 'mockChannelId'
    const mockResponseUrl = 'mockResponseUrl'
    const mockWebhookId = 'mockWebhookId'
    const mockWebhookUrl = `webhook.com/${mockWebhookId}`

    it('should send a response to the responseUrl containing the webhook url', async () => {
      Channel.findOne = jest.fn(() => Promise.resolve({ webhookId: mockWebhookId }))
      buildWebhookUrlSpy.mockImplementationOnce(() => mockWebhookUrl)

      await webhookCommands.getOrCreateWebhookForChannel(
        mockChannelId,
        mockResponseUrl
      )

      expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
        mockResponseUrl,
        expect.stringContaining(mockWebhookUrl)
      )
    })

    describe('when a channel does have an existing webhook id', () => {
      const existingWebhookId = 'existingWebhookId'

      beforeEach(() => {
        Channel.findOne = jest.fn(() => ({ webhookId: existingWebhookId }))
      })

      it('should use the channel\'s existing webhook id if available', async () => {
        await webhookCommands.getOrCreateWebhookForChannel(
          mockChannelId,
          mockResponseUrl
        )

        expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
          mockResponseUrl,
          expect.stringContaining(existingWebhookId)
        )
      })
    })

    describe('when a channel does not have an existing webhook id', () => {
      const newWebhookId = 'newWebhookId'

      beforeEach(() => {
        Channel.findOne = jest.fn(() => Promise.resolve({}))
        Channel.update = jest.fn(() => Promise.resolve())
        generateWebhookIdSpy.mockImplementationOnce(() => newWebhookId)
      })

      it('should generate a new webhook id and update the database', async () => {
        await webhookCommands.getOrCreateWebhookForChannel(
          mockChannelId,
          mockResponseUrl
        )

        expect(Channel.update).toHaveBeenCalled()
        expect(slack.sendResponseMessageAndBlocks).toHaveBeenCalledWith(
          mockResponseUrl,
          expect.stringContaining(newWebhookId)
        )
      })
    })
  })
})
