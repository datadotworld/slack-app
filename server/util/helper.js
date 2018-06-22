/*
 * Data.World Slack Application
 * Copyright 2018 data.world, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This product includes software developed at
 * data.world, Inc. (http://data.world/).
 */
const FILES_LIMIT = 5;
const LINKED_DATASET_LIMIT = 5;
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
  
module.exports = { helper, FILES_LIMIT, LINKED_DATASET_LIMIT };