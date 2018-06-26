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
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const Team = require("../models").Team;
const User = require("../models").User;

const array = require("lodash/array");
const string = require("lodash/string");
const collection = require("lodash/collection");
const lang = require("lodash/lang");
const pretty = require("prettysize");
const moment = require("moment");
const Sequelize = require("sequelize");
const SlackWebClient = require("@slack/client").WebClient;

const { dataworld } = require("../api/dataworld");
const { helper, FILES_LIMIT, LINKED_DATASET_LIMIT } = require("../util/helper");

const Op = Sequelize.Op;

// Possible event actions
const CREATE = "create";

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
    text: dataset.description || "_No Description_",
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
    collection.forEach(files, (file, index) => {
      if (index < FILES_LIMIT) {
        fieldValue += `• <https://data.world/${params.owner}/${
          params.datasetId
        }/workspace/file?filename=${file.name}|${file.name}> _(${pretty(
          file.sizeInBytes
        )})_\n`;
      } else {
        fieldValue += `<https://data.world/${params.owner}/${
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
    text: dataset.description || "_No Description_",
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
    text: project.objective || "_No Description_",
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
      collection.forEach(files, (file, index) => {
        if (index < FILES_LIMIT) {
          fieldValue += `• <https://data.world/${resourceId}/workspace/file?filename=${
            file.name
          }|${file.name}> _(${pretty(file.sizeInBytes)})_ \n`;
        } else {
          fieldValue += `<https://data.world/${resourceId}|See more>\n`;
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
        value: `_none found_\n_need some ?_\n_be the first to <https://data.world/${resourceId}|add one>_`
      });
    }
  } else {
    // there are linked datasets
    const linkedDatasets = project.linkedDatasets;
    let fieldValue = "";
    collection.forEach(linkedDatasets, linkedDataset => {
      if (index < LINKED_DATASET_LIMIT) {
        fieldValue += `• <https://data.world/${resourceId}/workspace/dataset?datasetid=${
          linkedDataset.id
        }|${linkedDataset.description || linkedDataset.title}>\n`;
      } else {
        fieldValue += `<https://data.world/${resourceId}|See more>\n`;
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

  collection.forEach(files, file => {
    fieldValue += `• <https://data.world/${params.owner}/${
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

const getEventSubscribedChannels = async (resourceId, subscriberId) => {
  const subscriber = await User.findOne({ where: { dwUserId: subscriberId } });
  if (subscriber) {
    const subscriptions = await Subscription.findAll({
      where: { resourceId: resourceId, slackUserId: subscriber.slackId }
    });
    return collection.map(subscriptions, "channelId");
  }
  console.error("ERROR: Active DW subscriber not found in DB : ", subscriberId);
  return;
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
  collection.forEach(channelIds, async channelId => {
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
      res.status(200).send();
      // process event based on type
      // Get resource id
      const resourceId = extractResouceIdFromWebLink(
        event.links.web.project || event.links.web.dataset,
        event.action
      );
      // Get DW subscriber id
      const subscriberId = event.subscriberid.split(":")[1];
      // Get subscriber
      const subscriber = await User.findOne({
        where: { dwUserId: subscriberId }
      });
      if (!subscriber) {
        console.error(
          "ERROR: Active DW subscriber not found in DB : ",
          subscriberId
        );
        return;
      }
      // Get subsciptions
      const subscriptions = await Subscription.findAll({
        where: { resourceId: resourceId, slackUserId: subscriber.slackId }
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
