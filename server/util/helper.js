const helper = {
    extractDatasetOrProjectParams(link) {
        let params = {};
        const cleanLink = link.replace(/(https\:\/\/data.world\/|)/g, '');
        const pathNames = cleanLink.split("/");
      
        params.owner = pathNames[0];
        params.datasetId = pathNames[1];
        params.link = link;
      
        return params;
      },
      
      extractInsightParams(link) {
        let params = {};
        let parts = link.split("/");
      
        params.insightId = parts[parts.length - 1];
        params.projectId = parts[parts.length - 3];
        params.owner = parts[parts.length - 4];
        params.link = link;
      
        return params;
      },
      
      extractInsightsParams(link) {
        let params = {};
        let parts = link.split("/");
      
        params.projectId = parts[parts.length - 2];
        params.owner = parts[parts.length - 3];
        params.link = link;
      
        return params;
      },

      extractIdFromLink(link) {
        let data = link.split("/");
        return data[data.length - 1];
      },

      cleanSlackLinkInput(link) {
        return link.replace(/(<https\:\/\/data.world\/|>)/g, '');
      }
};
  
module.exports = { helper };