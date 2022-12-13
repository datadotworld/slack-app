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
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const User = require("../models").User;

const array = require("lodash/array");
const collection = require("lodash/collection");
const lang = require("lodash/lang");
const pretty = require("prettysize");
const moment = require("moment");

const {
  handleAuthorizationRequest,
  handleContributionRequest
} = require("./events/requests")
const dataworld = require("../api/dataworld");
const slack = require("../api/slack");
const helper = require("../helpers/helper");
const {
  DATASET_AUTHORIZATION_TYPES,
  CONTRIBUTION_REQUEST_TYPES
} = require("../helpers/requests");
const { getBotAccessTokenForTeam } = require("../helpers/tokens");

const dwDomain = helper.DW_DOMAIN;

// Possible event actions
const CREATE = "create";
const UPDATE = "update";

// Possible event entities
const DATASET = "dataset";
const INSIGHT = "insight";
const FILE = "file";

const getEntityType = event => {
  // File event returns array. we handle that here.
  return lang.isArray(event) ? event[0].entity : event.entity;
};

const getNewDatasetBlocks = (
  params,
  dataset,
  event,
  dwOwner,
  dwActorId,
  actorSlackId,
  serverBaseUrl
) => {
  const offset = moment(
    event.timestamp,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(event.timestamp, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  const slackUserMentionText = actorSlackId
    ? `<@${actorSlackId}>`
    : `<${event.links.web.actor}|${dwActorId}>`;
  const resourceId = `${params.owner}/${params.datasetId}`;
  const fields = [];

  const files = dataset.files;
  if (!lang.isEmpty(files)) {
    let fieldValue = "";
    collection.forEach(files, (file, index) => {
      if (index < helper.FILES_LIMIT) {
        fieldValue += `• <https://${dwDomain}/${params.owner}/${params.datasetId
          }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(
            file.sizeInBytes
          )})_\n`;
      } else {
        fieldValue += `<https://${dwDomain}/${params.owner}/${params.datasetId
          }|See more>\n`;
        return false;
      }
    });

    fields.push({
      title: files.length > 1 ? "Files" : "File",
      value: fieldValue,
      short: false
    });
  } else {
    fields.push({
      title: "File(s)",
      value: `_none found_\n_need some ?_\n_be the first to <https://${dwDomain}/${resourceId}|add one>_`
    });
  }

  const tags = dataset.tags;
  if (!lang.isEmpty(tags)) {
    let fieldValue = "";
    collection.forEach(tags, tag => {
      fieldValue += `\`${tag}\` `;
    });
    fields.push({
      value: fieldValue,
      short: false
    });
  }

  let datasetDescription = dataset.description || "_No Description_"
  let blockText = `${slackUserMentionText} created a *new dataset*\n\n*<${event.links.web.dataset}|${dataset.title}>*\n${datasetDescription}\n`

  if (!lang.isEmpty(fields)) {
    collection.forEach(fields, field => {
      blockText += `${field.title}\n${field.value}\n`
    })
  }

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": blockText
      },
      "accessory": {
        "type": "image",
        "image_url": dwOwner.avatarUrl || `${serverBaseUrl}/assets/avatar.png`,
        "alt_text": "avatar"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": `${serverBaseUrl}/assets/dataset.png`,
          "alt_text": "dataset"
        },
        {
          "type": "mrkdwn",
          "text": `<!date^${ts}^${resourceId}  {date_short_pretty} at {time}|${resourceId}>`
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Explore :microscope:",
          },
          "url": `${event.links.web.dataset}/workspace`
        },
        {
          "type": "button",
          "action_id": "dataset_subscribe_button",
          "style": "primary",
          "text": {
            "type": "plain_text",
            "text": "Subscribe"
          },
          "value": `${resourceId}`
        }
      ]
    }]

  return blocks;
};

const getLinkedDatasetBlocks = (
  params,
  dataset,
  event,
  dwActor,
  actorSlackId,
  serverBaseUrl
) => {
  const offset = moment(
    event.timestamp,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(event.timestamp, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  const dwActorId = dwActor.id;
  const slackUserMentionText = actorSlackId
    ? `<@${actorSlackId}>`
    : `<${event.links.web.actor}|${dwActorId}>`;
  let fieldValue = "";

  const tags = dataset.tags;
  if (!lang.isEmpty(tags)) {
    collection.forEach(tags, tag => {
      fieldValue += `\`${tag}\` `;
    });
  }

  let datasetDescription = dataset.description || "_No Description_"
  let blockText = `${slackUserMentionText} linked a *dataset* to a *project*\n\n*<${event.links.web.actor}|${event.actor}>*\n<${event.links.web.project}/workspace|${dataset.title}>\n${datasetDescription}\n${fieldValue}\n`

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": blockText
      },
      "accessory": {
        "type": "image",
        "image_url": `${serverBaseUrl}/assets/link_dataset.png`,
        "alt_text": "avatar"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": `${serverBaseUrl}/assets/project.png`,
          "alt_text": "dataset"
        },
        {
          "type": "mrkdwn",
          "text": `<!date^${ts}^${params.owner}/${params.datasetId}  {date_short_pretty} at {time}|${params.owner}/${params.datasetId}>`
        }
      ]
    }]

  return blocks;
};

const getNewProjectBlocks = (
  params,
  project,
  event,
  dwOwner,
  dwActorId,
  actorSlackId,
  serverBaseUrl
) => {
  const offset = moment(
    event.timestamp,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(event.timestamp, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  const slackUserMentionText = actorSlackId
    ? `<@${actorSlackId}>`
    : `<${event.links.web.actor}|${dwActorId}>`;

  const resourceId = `${params.owner}/${params.datasetId}`;
  const fields = [];

  if (lang.isEmpty(project.linkedDatasets)) {
    const files = project.files;
    if (!lang.isEmpty(files)) {
      let fieldValue = "";
      collection.forEach(files, (file, index) => {
        if (index < helper.FILES_LIMIT) {
          fieldValue += `• <https://${dwDomain}/${resourceId}/workspace/file?filename=${file.name
            }|${file.name}> _(${pretty(file.sizeInBytes)})_ \n`;
        } else {
          fieldValue += `<https://${dwDomain}/${resourceId}|See more>\n`;
          return false;
        }
      });

      fields.push({
        title: files.length > 1 ? "Files" : "File",
        value: fieldValue,
        short: false
      });
    } else {
      fields.push({
        title: "File(s)",
        value: `_none found_\n_need some ?_\n_be the first to <https://${dwDomain}/${resourceId}|add one>_`
      });
    }
  } else {
    // there are linked datasets
    const linkedDatasets = project.linkedDatasets;
    let fieldValue = "";
    collection.forEach(linkedDatasets, (linkedDataset, index) => {
      if (index < helper.LINKED_DATASET_LIMIT) {
        fieldValue += `• <https://${dwDomain}/${resourceId}/workspace/dataset?datasetid=${linkedDataset.id
          }|${linkedDataset.description || linkedDataset.title}>\n`;
      } else {
        fieldValue += `<https://${dwDomain}/${resourceId}|See more>\n`;
        return false;
      }
    });

    fields.push({
      title: linkedDatasets.length > 1 ? "Linked datasets" : "Linked dataset",
      value: fieldValue,
      short: false
    });
  }

  const tags = project.tags;
  if (!lang.isEmpty(tags)) {
    let fieldValue = "";
    collection.forEach(tags, tag => {
      fieldValue += `\`${tag}\` `;
    });
    fields.push({
      value: fieldValue,
      short: false
    });
  }

  let projectDescription = project.objective || "_No Description_"
  let blockText = `${slackUserMentionText} created a *new project*\n\n*<${event.links.web.project}|${project.title}>*\n${projectDescription}\n`

  if (!lang.isEmpty(fields)) {
    collection.forEach(fields, field => {
      blockText += `${field.title}\n${field.value}\n`
    })
  }

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": blockText
      },
      "accessory": {
        "type": "image",
        "image_url": dwOwner.avatarUrl || `${serverBaseUrl}/assets/avatar.png`,
        "alt_text": "avatar"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": `${serverBaseUrl}/assets/project.png`,
          "alt_text": "project"
        },
        {
          "type": "mrkdwn",
          "text": `<!date^${ts}^${resourceId}  {date_short_pretty} at {time}|${resourceId}>`
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Explore :microscope:",
          },
          "url": `${event.links.web.dataset}/workspace`
        },
        {
          "type": "button",
          "style": "primary",
          "action_id": "dataset_subscribe_button",
          "text": {
            "type": "plain_text",
            "text": "Subscribe"
          },
          "value": `${resourceId}`
        }
      ]
    }]

  return blocks;
};

const getNewInsightBlocks = (
  params,
  insight,
  event,
  dwActor,
  actorSlackId,
  serverBaseUrl
) => {
  const offset = moment(
    event.timestamp,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(event.timestamp, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  const dwActorId = dwActor.id;
  const slackUserMentionText = actorSlackId
    ? `<@${actorSlackId}>`
    : `<${event.links.web.actor}|${dwActorId}>`;

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `${slackUserMentionText} shared a *new insight*\n\n*<${event.links.web.actor}|${event.actor}>*\n<${event.links.web.insight}|${insight.title}>\n${insight.title}`
      },
      "accessory": {
        "type": "image",
        "image_url": `${serverBaseUrl}/assets/insight.png`,
        "alt_text": "insight"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": `${serverBaseUrl}/assets/project.png`,
          "alt_text": "project"
        },
        {
          "type": "mrkdwn",
          "text": `<!date^${ts}^${params.owner}/${params.datasetId}  {date_short_pretty} at {time}|${params.owner}/${params.datasetId}>`
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Discuss :left_speech_bubble:",
          },
          "url": `https://${dwDomain}/${params.owner}/${params.datasetId}/insights/${insight.id
            }`
        }
      ]
    }]

  return blocks;
};

const getFileUploadBlocks = (
  params,
  files,
  event,
  dwActorId,
  actorSlackId,
  isProjectFiles,
  serverBaseUrl
) => {
  const offset = moment(
    event.timestamp,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(event.timestamp, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();

  const slackUserMentionText = actorSlackId
    ? `<@${actorSlackId}>`
    : `<${event.links.web.actor}|${dwActorId}>`;
  const fileCount = files.length;
  const fallback =
    fileCount > 1
      ? `${dwActorId} uploaded ${fileCount} files`
      : `${dwActorId} uploaded a file`;
  const pretext =
    fileCount > 1
      ? `${dwActorId} uploaded *${fileCount} files*`
      : `${dwActorId} uploaded *a file*`;
  let fieldValue = "";

  collection.forEach(files, file => {
    fieldValue += `• <https://${dwDomain}/${params.owner}/${params.datasetId
      }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(
        file.sizeInBytes
      )})_\n`;
  });

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": fileCount > 1 ? `${dwActorId} uploaded *${fileCount} files*\n\n*Files Uploaded*\n\n${fieldValue}` : `${dwActorId} uploaded *a file*\n\n*File Uploaded*\n\n${fieldValue}`
      },
      "accessory": {
        "type": "image",
        "image_url": isProjectFiles
          ? `${serverBaseUrl}/assets/file_upload_project.png`
          : `${serverBaseUrl}/assets/file_upload_dataset.png`,
        "alt_text": isProjectFiles ? "file upload project" : "file upload dataset"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": isProjectFiles
            ? `${serverBaseUrl}/assets/project.png`
            : `${serverBaseUrl}/assets/dataset.png`,
          "alt_text": isProjectFiles ? "project" : "dataset"
        },
        {
          "type": "mrkdwn",
          "text": `<!date^${ts}^${params.owner}/${params.datasetId}  {date_short_pretty} at {time}|${params.owner}/${params.datasetId}>`
        }
      ]
    }
  ]
  return blocks;
};

const extractResouceIdFromWebLink = (webLink, action) => {
  const data = webLink.split("/");
  const owner = data[data.length - 2];
  const id = data[data.length - 1];
  // create events will only be received for account subscriptions
  return action === CREATE ? owner : `${owner}/${id}`;
};

const handleDatasetEvent = async (
  resourceId,
  channelIds,
  user,
  event,
  dwActorId,
  actorSlackId,
  serverBaseUrl
) => {
  try {
    // Fetch necessary DW resources
    const isProject = event.links.web.project ? true : false; // check type.
    const params = helper.extractDatasetOrProjectParamsFromLink(
      event.links.web.project || event.links.web.dataset
    );
    const response = isProject
      ? await dataworld.getProject(
        params.datasetId,
        params.owner,
        user.dwAccessToken
      )
      : await dataworld.getDataset(
        params.datasetId,
        params.owner,
        user.dwAccessToken
      );
    const data = response.data;

    // dw owner object
    const dwOwnerId = helper.extractIdFromLink(event.links.web.owner);
    const dwOwnerResponse = await dataworld.getDWUser(
      user.dwAccessToken,
      dwOwnerId
    );
    const dwOwner = dwOwnerResponse.data;
    // Create attachment
    let blocks = null;

    if (event.action === CREATE) {
      //handle datasets/projects create event
      blocks = isProject
        ? getNewProjectBlocks(
          params,
          data,
          event,
          dwOwner,
          dwActorId,
          actorSlackId,
          serverBaseUrl
        )
        : getNewDatasetBlocks(
          params,
          data,
          event,
          dwOwner,
          dwActorId,
          actorSlackId,
          serverBaseUrl
        );
    } else {
      // handle dataset/project update events
      if (isProject) {
        // Fetch prev version
        const prevProjectResponse = await dataworld.getProjectByVersion(
          params.datasetId,
          params.owner,
          event.previous_version_id,
          user.dwAccessToken
        );
        const prevProject = prevProjectResponse.data;
        // Check size diff to ensure we send notification only when files are added not deleted.
        // This will keep the amount of notification going to slack minimal. Maybe we'll reconsider and handle file deletion in v2.
        if (data.files.length > prevProject.files.length) {
          // Get difference in files
          const addedFiles = array.differenceBy(
            data.files,
            prevProject.files,
            "name"
          );

          const fileBlocks = getFileUploadBlocks(
            params,
            addedFiles,
            event,
            dwActorId,
            actorSlackId,
            isProject,
            serverBaseUrl
          );
          return sendEventToSlack(channelIds, fileBlocks);
        }

        // Check size diff to ensure we send notification only when dataset are linked not removed.
        // This will keep the amount of notification going to slack minimal. Maybe we'll reconsider and handle unlinking in v2.
        if (data.linkedDatasets.length > prevProject.linkedDatasets.length) {
          // Get difference in linked Datasets
          const linkedDatasets = array.differenceBy(
            data.linkedDatasets,
            prevProject.linkedDatasets,
            "id"
          );
          const dwActorResponse = await dataworld.getDWUser(
            user.dwAccessToken,
            dwActorId
          );
          const dwActor = dwActorResponse.data;
          collection.forEach(linkedDatasets, linkedDataset => {
            const blocks = getLinkedDatasetBlocks(
              params,
              linkedDataset,
              event,
              dwActor,
              actorSlackId,
              serverBaseUrl
            );
            sendEventToSlack(channelIds, blocks);
          });
          return;
        }
        console.warn(
          "We don't process all project update event, we handle new files and link"
        );
        return;
      } else {
        // return we don't want to process dataset meta data update events for now.
        console.warn("We don't process dataset update event for now.");
        return;
      }
    }
    if (blocks) {
      // Send message
      sendEventToSlack(channelIds, blocks);
    }
  } catch (error) {
    console.error("Failed to handle dataset event : ", error);
  }
};

const handleInsightEvent = async (
  resourceId,
  channelIds,
  user,
  event,
  dwActorId,
  actorSlackId,
  serverBaseUrl
) => {
  const params = helper.extractDatasetOrProjectParamsFromLink(
    event.links.web.project
  );
  const dwInsightId = helper.extractIdFromLink(event.links.web.insight);
  const response = await dataworld.getInsight(
    dwInsightId,
    params.datasetId,
    params.owner,
    user.dwAccessToken
  );
  const insight = response.data;
  const dwActorResponse = await dataworld.getDWUser(
    user.dwAccessToken,
    dwActorId
  );
  const dwActor = dwActorResponse.data;
  const blocks = getNewInsightBlocks(
    params,
    insight,
    event,
    dwActor,
    actorSlackId,
    serverBaseUrl
  );
  sendEventToSlack(channelIds, blocks);
};

const handleFileEvents = async (
  resourceId,
  channelIds,
  user,
  events,
  dwActorId,
  actorSlackId,
  serverBaseUrl
) => {
  // For files we always receive an array of event from the webhook api
  // I believe this to handle situations where multiple files were uploaded at once

  // retrieve the first event from the array.
  const event = events[0];
  const params = helper.extractDatasetOrProjectParamsFromLink(
    event.links.web.project || event.links.web.dataset
  );
  const isProjectFiles = event.links.web.project ? true : false;
  // get DW project or dataset
  const response = isProjectFiles
    ? await dataworld.getProject(
      params.datasetId,
      params.owner,
      user.dwAccessToken
    )
    : await dataworld.getDataset(
      params.datasetId,
      params.owner,
      user.dwAccessToken
    );
  const data = response.data;

  // get newly added file names from event.
  const newFiles = collection.map(events, "file");
  // Select newly added file(s) only.
  const files = [];
  collection.forEach(data.files, file => {
    if (newFiles.indexOf(file.name) > -1) {
      files.push(file);
    }
  });

  const blocks = getFileUploadBlocks(
    params,
    files,
    event,
    dwActorId,
    actorSlackId,
    isProjectFiles,
    serverBaseUrl
  );
  sendEventToSlack(channelIds, blocks);
};

const sendEventToSlack = async (channelIds, blocks) => {
  //send blocks to all subscribed channels
  collection.forEach(channelIds, async channelId => {
    const channel = await Channel.findOne({ where: { channelId: channelId } });
    sendSlackMessage(channelId, blocks, channel.teamId);
  });
};


const sendSlackMessage = async (channelId, blocks, teamId) => {
  const token = await getBotAccessTokenForTeam(teamId)
  slack.sendMessageWithBlocks(token, channelId, blocks);
};

const webhook = {
  async processSubscriptionEvent(req, res) {
    try {
      console.log("processSubscriptionEvent", req.body)
      const event = lang.isArray(req.body) ? req.body[0] : req.body;
      // process event based on type
      // Get resource id

      // When insigts are added the action in event payload is Create not Update (of project as expected), this help nomalize things.
      const action = event.links.web.insight ? UPDATE : event.action;
      const resourceId = extractResouceIdFromWebLink(
        event.links.web.project || event.links.web.dataset,
        action
      );
      // Get DW subscriber id
      const subscriberId = event.subscriberid.split(":")[1];
      console.log("event subscribe id ", subscriberId, event)
      // Get subscriber
      const subscriber = await User.findOne({
        where: { dwUserId: subscriberId }
      });
      if (!subscriber) {
        console.error("Active DW subscriber not found in DB : ", subscriberId);
        return res.status(404).send();
      } else {
        res.status(200).send();
      }
      // Get subsciptions
      const subscriptions = await Subscription.findAll({
        where: { resourceId: resourceId, slackUserId: subscriber.slackId }
      });
      if (!lang.isEmpty(subscriptions)) {
        // Get subscribed channelIds
        const channelIds = collection.map(subscriptions, "channelId");
        const dwActorId = helper.extractIdFromLink(event.links.web.actor);
        const actor = await User.findOne({ where: { dwUserId: dwActorId } });
        const actorSlackId = actor ? actor.slackId : null;
        const serverBaseUrl = helper.getServerBaseUrl(req);
        switch (getEntityType(event)) {
          case DATASET:
            handleDatasetEvent(
              resourceId,
              channelIds,
              subscriber,
              req.body,
              dwActorId,
              actorSlackId,
              serverBaseUrl
            );
            break;
          case INSIGHT:
            handleInsightEvent(
              resourceId,
              channelIds,
              subscriber,
              req.body,
              dwActorId,
              actorSlackId,
              serverBaseUrl
            );
            break;
          case FILE:
            handleFileEvents(
              resourceId,
              channelIds,
              subscriber,
              req.body,
              dwActorId,
              actorSlackId,
              serverBaseUrl
            );
            break;
          default:
            console.warn("Received unknown dw webhook event : ", req.body);
            break;
        }
      } else {
        console.warn("No subscriptions found for event.");
      }
    } catch (error) {
      console.error("Failed to process subscription event! : ", error.message);
    }
  },

  async processWebhookEvent(req, res) {
    try {
      const body = req.body;
      const webhookId = req.params.webhookId;
      const eventType = body.eventType;

      const channels = await Channel.findAll({ where: { webhookId } });
      if (lang.isEmpty(channels)) {
        const errorMessage = `Could not find webhookId: ${webhookId}`;
        console.error(errorMessage);
        res.status(404).send(errorMessage);
      }
      const channelIds = collection.map(channels, "channelId");

      if (Object.values(DATASET_AUTHORIZATION_TYPES).includes(eventType)) {
        await handleAuthorizationRequest(body, channelIds);
      } else if (Object.values(CONTRIBUTION_REQUEST_TYPES).includes(eventType)) {
        await handleContributionRequest(body, channelIds);
      } else {
        const errorMessage = `Invalid eventType: ${eventType}`;
        console.error(errorMessage);
        res.status(400).send(errorMessage);
      }

      res.status(200).send();
    } catch (error) {
      console.error("Failed to process webhook event : ", error.message);
      res.status(500).send();
    }
  }
};

module.exports = { webhook };
