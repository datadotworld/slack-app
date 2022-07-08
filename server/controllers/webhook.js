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

const getNewDatasetAttachment = (
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
  const attachment = {
    fallback: `${dwActorId} created a new dataset`,
    pretext: `${slackUserMentionText} created a *new dataset*`,
    title: dataset.title,
    title_link: event.links.web.dataset,
    thumb_url:
      dwOwner.avatarUrl || `${serverBaseUrl}/assets/avatar.png`,
    color: "#5CC0DE",
    text: dataset.description || "_No Description_",
    footer: `${resourceId}`,
    footer_icon: `${serverBaseUrl}/assets/dataset.png`,
    ts: ts,
    mrkdwn_in: ["text", "pretext", "fields"],
    callback_id: "dataset_subscribe_button",
    actions: [
      {
        type: "button",
        text: "Explore :microscope:",
        url: `${event.links.web.dataset}/workspace`
      },
      {
        name: "subscribe",
        text: "Subscribe",
        style: "primary",
        type: "button",
        value: `${resourceId}`
      }
    ]
  };

  const fields = [];

  const files = dataset.files;
  if (!lang.isEmpty(files)) {
    let fieldValue = "";
    collection.forEach(files, (file, index) => {
      if (index < helper.FILES_LIMIT) {
        fieldValue += `• <https://${dwDomain}/${params.owner}/${
          params.datasetId
        }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(
          file.sizeInBytes
        )})_\n`;
      } else {
        fieldValue += `<https://${dwDomain}/${params.owner}/${
          params.datasetId
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

  if (!lang.isEmpty(fields)) {
    attachment.fields = fields;
  }

  return attachment;
};

const getLinkedDatasetAttachment = (
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

  const attachment = {
    fallback: `${dwActorId} linked a dataset to a project`,
    color: "#F6BD68",
    pretext: `${slackUserMentionText} linked a *dataset* to a *project*`,
    author_name: event.actor,
    author_link: event.links.web.actor,
    author_icon: dwActor.avatarUrl,
    title: dataset.title,
    title_link: `${event.links.web.project}/workspace`,
    text: dataset.description || "_No Description_",
    thumb_url: `${serverBaseUrl}/assets/link_dataset.png`,
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: `${serverBaseUrl}/assets/project.png`,
    ts: 123456789,
    mrkdwn_in: ["text", "pretext", "fields"]
  };

  const fields = [];

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

  if (!lang.isEmpty(fields)) {
    attachment.fields = fields;
  }

  return attachment;
};

const getNewProjectAttachment = (
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

  const attachment = {
    fallback: `${dwActorId} created a new project`,
    pretext: `${slackUserMentionText} created a *new project*`,
    title: project.title,
    title_link: event.links.web.project,
    thumb_url:
      dwOwner.avatarUrl ||
      `${serverBaseUrl}/assets/avatar.png`,
    color: "#F6BD68",
    text: project.objective || "_No Description_",
    footer: `${resourceId}`,
    footer_icon: `${serverBaseUrl}/assets/project.png`,
    ts: ts,
    mrkdwn_in: ["text", "pretext", "fields"],
    callback_id: "dataset_subscribe_button",
    actions: [
      {
        type: "button",
        text: "Explore :microscope:",
        url: `${event.links.web.dataset}/workspace`
      },
      {
        name: "subscribe",
        text: "Subscribe",
        style: "primary",
        type: "button",
        value: `${resourceId}`
      }
    ]
  };

  const fields = [];

  if (lang.isEmpty(project.linkedDatasets)) {
    const files = project.files;
    if (!lang.isEmpty(files)) {
      let fieldValue = "";
      collection.forEach(files, (file, index) => {
        if (index < helper.FILES_LIMIT) {
          fieldValue += `• <https://${dwDomain}/${resourceId}/workspace/file?filename=${
            file.name
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
        fieldValue += `• <https://${dwDomain}/${resourceId}/workspace/dataset?datasetid=${
          linkedDataset.id
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

  if (!lang.isEmpty(fields)) {
    attachment.fields = fields;
  }

  return attachment;
};

const getNewInsightAttachment = (
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

  const attachment = {
    fallback: `${dwActorId} shared a new insight`,
    pretext: `${slackUserMentionText} shared a *new insight*`,
    author_name: event.actor,
    author_link: event.links.web.actor,
    author_icon: dwActor.avatarUrl,
    title: insight.title,
    title_link: event.links.web.insight,
    thumb_url: `${serverBaseUrl}/assets/insight.png`,
    image_url: insight.thumbnail,
    color: "#9581CA",
    text: insight.description,
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: `${serverBaseUrl}/assets/project.png`,
    ts: ts,
    mrkdwn_in: ["text", "pretext"],
    actions: [
      {
        type: "button",
        text: "Discuss :left_speech_bubble:",
        url: `https://${dwDomain}/${params.owner}/${params.datasetId}/insights/${
          insight.id
        }`
      }
    ]
  };

  return attachment;
};

const getFileUploadAttachment = (
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
  const attachment = {
    fallback: fallback,
    pretext: pretext,
    color: isProjectFiles ? "#F6BD68" : "#5CC0DE", // changes if it's project file upload
    thumb_url: isProjectFiles
      ? `${serverBaseUrl}/assets/file_upload_project.png`
      : `${serverBaseUrl}/assets/file_upload_dataset.png`, // changes if it's project file upload
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: isProjectFiles
      ? `${serverBaseUrl}/assets/project.png`
      : `${serverBaseUrl}/assets/dataset.png`, // changes if it's project file upload
    ts: ts,
    mrkdwn_in: ["pretext", "fields"]
  };

  const fields = [];
  let fieldValue = "";

  collection.forEach(files, file => {
    fieldValue += `• <https://${dwDomain}/${params.owner}/${
      params.datasetId
    }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(
      file.sizeInBytes
    )})_\n`;
  });

  fields.push({
    title: fileCount > 1 ? "Files Uploaded" : "File Uploaded",
    value: fieldValue,
    short: false
  });

  attachment.fields = fields;

  return attachment;
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
    console.log("handleDatasetEvent", event.links.web.project);
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
    let attachment = null;

    if (event.action === CREATE) {
      //handle datasets/projects create event
      attachment = isProject
        ? getNewProjectAttachment(
            params,
            data,
            event,
            dwOwner,
            dwActorId,
            actorSlackId,
            serverBaseUrl
          )
        : getNewDatasetAttachment(
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

          const fileAttachment = getFileUploadAttachment(
            params,
            addedFiles,
            event,
            dwActorId,
            actorSlackId,
            isProject,
            serverBaseUrl
          );
          return sendEventToSlack(channelIds, fileAttachment);
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
            const attachment = getLinkedDatasetAttachment(
              params,
              linkedDataset,
              event,
              dwActor,
              actorSlackId,
              serverBaseUrl
            );
            sendEventToSlack(channelIds, attachment);
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
    if (attachment) {
      // Send message
      sendEventToSlack(channelIds, attachment);
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
  console.log("insight event")
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
  const attachment = getNewInsightAttachment(
    params,
    insight,
    event,
    dwActor,
    actorSlackId,
    serverBaseUrl
  );
  sendEventToSlack(channelIds, attachment);
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

  const attachment = getFileUploadAttachment(
    params,
    files,
    event,
    dwActorId,
    actorSlackId,
    isProjectFiles,
    serverBaseUrl
  );
  sendEventToSlack(channelIds, attachment);
};

const sendEventToSlack = async (channelIds, attachment) => {
  //send attachment to all subscribed channels
  collection.forEach(channelIds, async channelId => {
    const channel = await Channel.findOne({ where: { channelId: channelId } });
    sendSlackMessage(channelId, attachment, channel.teamId);
  });
};

const sendSlackMessage = async (channelId, attachment, teamId) => {
  const token = await getBotAccessTokenForTeam(teamId)
  slack.sendMessageWithAttachments(token, channelId, [attachment]);
};

const webhook = {
  async processSubscriptionEvent(req, res) {
    try {
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
