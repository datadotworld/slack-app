const helper = {
    extractDatasetOrProjectParams = link => {
        let params = {};
        let parts = link.split("/");
      
        params.datasetId = parts[parts.length - 1];
        params.owner = parts[parts.length - 2];
        params.link = link;
      
        return params;
      },
      
      //TODO : This needs to be refactored.
      extractInsightParams = link => {
        let params = {};
        let parts = link.split("/");
      
        params.insightId = parts[parts.length - 1];
        params.projectId = parts[parts.length - 3];
        params.owner = parts[parts.length - 4];
        params.link = link;
      
        return params;
      },
      
      //TODO : This needs to be refactored.
      extractInsightsParams = link => {
        let params = {};
        let parts = link.split("/");
      
        params.projectId = parts[parts.length - 2];
        params.owner = parts[parts.length - 3];
        params.link = link;
      
        return params;
      }
};
  
module.exports = { helper };