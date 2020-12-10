function getWebAgentLink(agentid) {
  return `https://data.world/${agentid}`
}

function getWebDatasetLink(agentid, datasetid) {
  return `https://data.world/${agentid}/${datasetid}`
}

module.exports = {
  getWebAgentLink,
  getWebDatasetLink
}
