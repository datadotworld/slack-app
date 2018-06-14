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
const array = require("lodash/array");
const string = require("lodash/string");
const collection = require("lodash/collection");
const lang = require("lodash/lang");
const pretty = require("prettysize");
const moment = require("moment");
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const Team = require("../models").Team;
const User = require("../models").User;
const SlackWebClient = require("@slack/client").WebClient;
const Sequelize = require("sequelize");
const { dataworld } = require("../api/dataworld");
const { helper } = require("../util/helper");

const Op = Sequelize.Op;

// Possible event actions
const CREATE = "create";
const UPDATE = "update";
const DELETE = "delete";
const UPLOAD = "upload";

// Possible event entities
const DATASET = "dataset";
const INSIGHT = "insight";
const FILE = "file";

const getEntityType = event => {
  // File event returns array. we handle that here.
  return lang.isArray(event) ? event[0].entity : event.entity;
};

const getAttachment = (author, authorLink, owner, ownerLink, text) => {
  const attachment = {
    author_name: author,
    author_link: authorLink,
    color: "#79B8FB",
    text: text,
    footer: `Owner : ${owner}`,
    footer_icon: ownerLink
  };

  return attachment;
};

const getNewDatasetAttachment = (
  params,
  dataset,
  event,
  dwOwner,
  dwActorId,
  actorSlackId
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
      dwOwner.avatarUrl ||
      "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
    color: "#5CC0DE",
    text: dataset.description || "*No Description*",
    footer: `${resourceId}`,
    footer_icon: "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT",
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
    collection.forEach(files, file => {
      fieldValue += `• <https://data.world/${params.owner}/${
        params.datasetId
      }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(file.sizeInBytes)})_\n`;
    });

    fields.push({
      title: files.length > 1 ? "Files" : "File",
      value: fieldValue,
      short: false
    });
  } else {
    fields.push({
      title: "File(s)",
      value: `_none found_\n_need some ?_\n_be the first to <https://data.world/${resourceId}|add one>_`
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
  actorSlackId
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
    text: dataset.description || "*No Description*",
    thumb_url: "https://cdn.filepicker.io/api/file/F4HMCtpTiqpfQltddbYg",
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
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
  actorSlackId
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
      "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
    color: "#F6BD68",
    text: project.objective || "*No Description*",
    footer: `${resourceId}`,
    footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
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
      collection.forEach(files, file => {
        fieldValue += `• <https://data.world/${resourceId}/workspace/file?filename=${file.name}|${file.name}> _(${pretty(file.sizeInBytes)})_\n`;
      });

      fields.push({
        title: files.length > 1 ? "Files" : "File",
        value: fieldValue,
        short: false
      });
    } else {
      fields.push({
        title: "File(s)",
        value: `_none found_\n_need some ?_\n_be the first to <https://data.world/${resourceId}|add one>_`
      });
    }
  } else {
    // there are linked datasets
    const linkedDatasets = project.linkedDatasets;
    let fieldValue = "";
    collection.forEach(linkedDatasets, linkedDataset => {
      fieldValue += `• <https://data.world/${resourceId}/workspace/dataset?datasetid=${
        linkedDataset.id
      }|${linkedDataset.description || linkedDataset.title}>\n`;
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
  actorSlackId
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
    thumb_url: "https://cdn.filepicker.io/api/file/CQvuh91XRlqhTKEimEls",
    image_url: insight.thumbnail,
    color: "#9581CA",
    text: insight.description,
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
    ts: ts,
    mrkdwn_in: ["text", "pretext"],
    actions: [
      {
        type: "button",
        text: "Discuss :left_speech_bubble:",
        url: `https://data.world/${params.owner}/${params.datasetId}/insights/${
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
  isProjectFiles
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
      ? "https://cdn.filepicker.io/api/file/y3pOY9LSCSETkcqcvUtX"
      : "https://cdn.filepicker.io/api/file/KneqPAwARf6qJr5njc8Q", // changes if it's project file upload
    footer: `${params.owner}/${params.datasetId}`,
    footer_icon: isProjectFiles
      ? "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr"
      : "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT", // changes if it's project file upload
    ts: ts,
    mrkdwn_in: ["pretext", "fields"]
  };

  const fields = [];
  let fieldValue = "";
  console.log("Fields in files: ", files);

  collection.forEach(files, file => {
    fieldValue += `• <https://data.world/${params.owner}/${
      params.datasetId
    }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(file.sizeInBytes)})_\n`;
  });

  fields.push({
    title: fileCount > 1 ? "Files Uploaded" : "File Uploaded",
    value: fieldValue,
    short: false
  });

  attachment.fields = fields;

  return attachment;
};

const getFileEventAttachmentText = event => {
  switch (event.action) {
    case UPLOAD:
      return `Added new file(s) to <${event.links.web.project ||
        event.links.web.dataset}|${event.project || event.dataset}>`;
    case UPDATE:
      return `Updated file <${event.links.web.file}|${event.file}> in <${event
        .links.web.project || event.links.web.dataset}|${event.project ||
        event.dataset}>`;
    case DELETE:
      return `Removed file <${event.links.web.file}|${event.file}> from <${event
        .links.web.project || event.links.web.dataset}|${event.project ||
        event.dataset}>`;
    default:
      console.warn("Unrecognized Insight event action : ", event);
      return "";
  }
};

const extractResouceIdFromWebLink = (webLink, action) => {
  let data = webLink.split("/");
  let owner = data[data.length - 2];
  let id = data[data.length - 1];
  // create events will be received for account subscriptions
  return action === CREATE ? owner : `${owner}/${id}`;
};

const getEventSubscribedChannels = async resourceId => {
  const subscriptions = await Subscription.findAll({
    where: { resourceId: resourceId }
  });
  console.log("Found subsciptions : ", JSON.stringify(subscriptions));
  return collection.map(subscriptions, "channelId");
};

const handleDatasetEvent = async (
  resourceId,
  channelIds,
  user,
  event,
  dwActorId,
  actorSlackId
) => {
  try {
    // Fetch necessary DW resources
    const isProject = event.links.web.project ? true : false; // check type.
    const params = helper.extractDatasetOrProjectParams(
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
            actorSlackId
          )
        : getNewDatasetAttachment(
            params,
            data,
            event,
            dwOwner,
            dwActorId,
            actorSlackId
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
            isProject
          );
          return sendEventToSlack(resourceId, channelIds, fileAttachment);
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
              actorSlackId
            );
            sendEventToSlack(resourceId, channelIds, attachment);
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
      sendEventToSlack(resourceId, channelIds, attachment);
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
  actorSlackId
) => {
  const params = helper.extractDatasetOrProjectParams(event.links.web.project);
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
    actorSlackId
  );
  sendEventToSlack(resourceId, channelIds, attachment);
};

const handleFileEvents = async (
  resourceId,
  channelIds,
  user,
  events,
  dwActorId,
  actorSlackId
) => {
  // For files we always receive an array of event from the webhook api
  // I believe this to handle situations where multiple files were uploaded at once

  // retrieve the first event from the array.
  const event = events[0];
  const params = helper.extractDatasetOrProjectParams(
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
    isProjectFiles
  );
  sendEventToSlack(resourceId, channelIds, attachment);
};

const sendEventToSlack = async (resourceId, channelIds, attachment) => {
  //send attachment to all subscribed channels
  console.log("Sending attachment : ", attachment);
  console.log("Found channelIds : ", channelIds);
  collection.forEach(channelIds, async channelId => {
    console.log("Sending attachment to channel : " + channelId);
    const channel = await Channel.findOne({ where: { channelId: channelId } });
    sendSlackMessage(channelId, attachment, channel.teamId);
  });
};

const sendSlackMessage = async (channelId, attachment, teamId) => {
  const team = await Team.findOne({ where: { teamId: teamId } });
  const slackBot = new SlackWebClient(
    process.env.SLACK_BOT_TOKEN || team.botAccessToken
  );
  slackBot.chat.postMessage(channelId, "", {
    attachments: [attachment]
  });
};

const webhook = {
  async process(req, res) {
    try {
      const event = lang.isArray(req.body) ? req.body[0] : req.body;
      console.log("Incoming DW webhook event : ", event);
      res.status(200).send();
      // process event based on type
      // Get resource id
      const resourceId = extractResouceIdFromWebLink(
        event.links.web.project || event.links.web.dataset,
        event.action
      );
      // Get subsciptions
      const subscriptions = await Subscription.findAll({
        where: { resourceId: resourceId }
      });
      if (!lang.isEmpty(subscriptions)) {
        // Get subscribed channelIds
        const channelIds = collection.map(subscriptions, "channelId");
        // Get subscribers
        const subscriberIds = collection.map(subscriptions, "slackUserId");
        // Get one user from list of subscribers
        const user = await User.findOne({
          where: {
            slackId: { [Op.in]: subscriberIds },
            dwAccessToken: { [Op.ne]: null }
          }
        });
        // get actor object info
        const dwActorId = helper.extractIdFromLink(event.links.web.actor);
        const actor = await User.findOne({ where: { dwUserId: dwActorId } });
        const actorSlackId = actor ? actor.slackUserId : null;

        switch (getEntityType(event)) {
          case DATASET:
            handleDatasetEvent(
              resourceId,
              channelIds,
              user,
              req.body,
              dwActorId,
              actorSlackId
            );
            break;
          case INSIGHT:
            handleInsightEvent(
              resourceId,
              channelIds,
              user,
              req.body,
              dwActorId,
              actorSlackId
            );
            break;
          case FILE:
            handleFileEvents(
              resourceId,
              channelIds,
              user,
              req.body,
              dwActorId,
              actorSlackId
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
      console.error("Failed to process webhook event! : ", error);
    }
  }
};

module.exports = { webhook };