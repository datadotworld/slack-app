const getOriginFromUrl = (urlString) => {
  const url = new URL(urlString)
  return `${url.origin}`
}

const getWebAgentLink = (origin, agentid) => {
  return `${origin}/${agentid}`
}

const getWebDatasetLink = (origin, agentid, datasetid) => {
  return `${origin}/${agentid}/${datasetid}`
}

module.exports = {
  getOriginFromUrl,
  getWebAgentLink,
  getWebDatasetLink
}
