const uuidv4 = require('uuid/v4')

const buildWebhookUrl = (webhookId) => {
  return `${process.env.SERVER_PUBLIC_HOSTNAME}/api/v1/webhook/${webhookId}`
}

const generateWebhookId = () => {
  // uuidv4 is used to create a random nonce as the webhookId
  return uuidv4()
}

module.exports = {
  buildWebhookUrl,
  generateWebhookId
}
