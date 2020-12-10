const Channel = require('../models').Channel;

const slack = require('../api/slack')
const webhookHelper = require('../helpers/webhook')

const getOrCreateWebhookForChannel = async (channelId, responseUrl) => {
  const channel = await Channel.findOne({
    where: { channelId }
  })

  let webhookId
  if (channel.webhookId) {
    webhookId = channel.webhookId
  } else {
    webhookId = webhookHelper.generateWebhookId();
    await Channel.update(
      { webhookId },
      { where: { channelId } }
    )
  }

  slack.sendResponse(responseUrl, {
    text: `The webhook URL for this channel is \`${
      webhookHelper.buildWebhookUrl(webhookId)
    }\``
  })
}

module.exports = {
  getOrCreateWebhookForChannel
}
