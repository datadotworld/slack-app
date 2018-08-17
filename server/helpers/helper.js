/*
 * data.world Slack Application
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
const collection = require("lodash/collection");
const Subscription = require("../models").Subscription;
const FILES_LIMIT = 5;
const LINKED_DATASET_LIMIT = 5;
const DW_AUTH_URL = `${process.env.DW_AUTH_BASE_URL}?client_id=${
  process.env.DW_CLIENT_ID
}&redirect_uri=${process.env.DW_REDIRECT_URI}&state=`;

const extractParamsFromCommand = (command, isAccountCommand) => {
  const params = {};
  const parts = command.split(" ");
  const datasetInfo = parts[parts.length - 1];
  const data = datasetInfo.split("/");

  params.owner = isAccountCommand ? null : data[data.length - 2];
  params.id = data[data.length - 1];

  return params;
};

const extractDatasetOrProjectParamsFromLink = link => {
  let params = {};
  const cleanLink = link.replace(/(https\:\/\/data.world\/|)/g, "");
  const pathNames = cleanLink.split("/");

  params.owner = pathNames[0];
  params.datasetId = pathNames[1];
  params.link = link;

  return params;
};

const extractQueryParams = link => {
  const params = {};
  const parts = link.split("=");

  params.queryId =  parts.pop();

  const baseUrl = parts.pop();
  const paths = baseUrl.split("/");

  params.owner = paths[3];
  params.datasetId = paths[4];
  params.link = link;

  return params;
};

const extractInsightParams = link => {
  let params = {};
  let parts = link.split("/");

  params.insightId = parts.pop();
  parts.pop();
  params.projectId = parts.pop();
  params.owner = parts.pop();
  params.link = link;

  return params;
};

const extractInsightsParams = link => {
  const params = {};
  const parts = link.split("/");

  parts.pop();
  params.projectId = parts.pop();
  params.owner = parts.pop();
  params.link = link;

  return params;
};

const extractIdFromLink = link => {
  const data = link.split("/");
  return data.pop();
};

const cleanSlackLinkInput = link => {
  return link.replace(/(<https\:\/\/data.world\/|>)/g, "");
};

const getSubscriptionStatus = async (resourceid, channelid, userId) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: {
        resourceId: resourceid,
        slackUserId: userId
      }
    });
    const channelSubscriptions = collection.filter(subscriptions, function(o) {
      return o.channelId === channelid;
    });

    const removeDWSubscription = subscriptions.length === 1;
    const hasChannelSubscription = channelSubscriptions.length > 0;

    return [hasChannelSubscription, removeDWSubscription];
  } catch (error) {
    console.error("Failed to fecth subscription from DB", error);
    return [false, false];
  }
};

module.exports = {
  FILES_LIMIT,
  LINKED_DATASET_LIMIT,
  DW_AUTH_URL,
  extractParamsFromCommand,
  extractDatasetOrProjectParamsFromLink,
  extractInsightParams,
  extractInsightsParams,
  extractIdFromLink,
  extractQueryParams,
  cleanSlackLinkInput,
  getSubscriptionStatus
};
