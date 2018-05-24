const string = require("lodash/string");
const collection = require("lodash/collection");
const lang = require("lodash/lang");
const moment = require("moment");
const Channel = require("../models").Channel;
const Subscription = require("../models").Subscription;
const Team = require("../models").Team;
const SlackWebClient = require("@slack/client").WebClient;
const { dataworld } = require("../api/dataworld");
const { helper } = require("../util/helper");

// Possible event actions
const CREATE = "create";
const UPDATE = "update";
const DELETE = "delete";
const UPLOAD = "upload";

//Possible event entities
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

const getNewDatasetAttachment = (params, dataset, event) => {
  // DW actor or owner
  // DW dataset (api call)
  // user slack id

  // event.actor,
  // event.links.web.actor,
  // event.owner,
  // event.links.web.owner,

  const attachment = {
    fallback: `${event.actor} created a new dataset`,
    pretext: `${event.actor} created a *new dataset*`,
    title: dataset.title,
    title_link: event.links.web.dataset,
    thumb_url: "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
    color: "#5CC0DE",
    text: dataset.description,
    footer: `${params.owner}/${params.id}`, // dataset id
    footer_icon: "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT",
    ts: moment(event.timestamp), // dataset created timestamp
    mrkdwn_in: ["text", "pretext", "fields"],
    actions: [
      {
        type: "button",
        text: "Explore :microscope:",
        url: `${event.links.web.dataset}/workspace`
      }
    ]
  };

  const fields = [];

  if (dataset.files.length > 0) {
    fields.push({
      title: "Total files",
      value: dataset.files.length,
      short: false
    });
  }

  if (dataset.tags.length > 0) {
    fields.push({
      value: lang.toString(dataset.tags),
      short: false
    });
  }

  if (fields.length > 0) {
    attachment.fields = fields;
  }

  return attachment;
};

const getUpdatedDatasetAttachment = () => {
  // DW actor or owner
  // DW dataset (api call)
  // user slack id
  const attachment = {
  };

  return attachment;
};

const getDatasetEventAttachmentText = event => {
  // "Successfully updated <http://data.world|2016 Uber customers>"
  let action = string.capitalize(event.action);
  return `Successfully ${action}d <${event.links.web.project ||
    event.links.web.dataset}|${event.project || event.dataset}>`;
};

const getInsightEventAttachmentText = event => {
  switch (event.action) {
    case CREATE:
      return `Added new insight <${event.links.web.insight}|${
        event.insight
      }> to <${event.links.web.project ||
        event.links.web.dataset}|${event.project || event.dataset}>`;
    case UPDATE:
      return `Updated insight <${event.links.web.insight}|${
        event.insight
      }> in <${event.links.web.project ||
        event.links.web.dataset}|${event.project || event.dataset}>`;
    case DELETE:
      return `Removed insight <${event.links.web.insight}|${
        event.insight
      }> from <${event.links.web.project ||
        event.links.web.dataset}|${event.project || event.dataset}>`;
    default:
      console.warn("Unrecognized Insight event action : ", event);
      return "";
  }
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

//TODO : This needs to be refactored.
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

const handleDatasetEvent = async event => {
  try {
    // Get resource id
    const resourceId = extractResouceIdFromWebLink(
      event.links.web.project || event.links.web.dataset,
      event.action
    );
    // Get subsciptions
    const subscriptions = await Subscription.findAll({
      where: { resourceId: resourceId }
    });
    // Get subscribed channelIds
    const channelIds = collection.map(subscriptions, "channelId");
    // Get subscribers
    const subscribers = collection.map(subscriptions, "slackUserId");
    // Get one user from list of subscribers
    const user = await User.findOne({
      where: {
        slackId: { [Op.in]: subscribers },
        dwAccessToken: { [Op.ne]: null }
      }
    });
    // Fetch necessary DW resources
    const params = helper.extractDatasetOrProjectParams(event.links.web.project || event.links.web.dataset);
    const response = await dataworld.getDataset(
      params.id,
      params.owner,
      user.dwAccessToken
    );
    const dataset = response.data;
    // Create attachment
    const attachment = event.action === CREATE ? getNewDatasetAttachment(params, dataset, event) : getUpdatedDatasetAttachment();
    // Send message
    sendEventToSlack(resourceId, channelIds, attachment);
  } catch (error) {
    console.error("Failed to handle dataset event : ", error);
  }
};

const handleInsightEvent = event => {
  // Get resource id
  // Get subsciptions
  // Get subscribers
  // Get subscribed channels
  // Fetch necessary DW resources
  // Create attachment
  // Send message
  const attachmentText = getInsightEventAttachmentText(event);
  const attachment = getAttachment(
    event.actor,
    event.links.web.actor,
    event.owner,
    event.links.web.owner,
    attachmentText
  );
  sendEventToSlack(event, attachment);
};

const handleFileEvents = events => {
  // For files we always receive an array of event from the webhook api
  // I believe this to handle situations where multiple files were uploaded at once

  // retrieve the first event from the array.
  const event = events[0];
  const attachmentText = getFileEventAttachmentText(event);
  const attachment = getAttachment(
    event.actor,
    event.links.web.actor,
    event.owner,
    event.links.web.owner,
    attachmentText
  );

  // add all files as attachment fields.
  const fields = [];
  collection.forEach(events, event => {
    fields.push({
      value: `<${event.links.web.file}|${event.file}>`,
      short: true
    });
  });
  if (fields.length > 0) {
    attachment.fields = fields;
  }

  sendEventToSlack(event, attachment);
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
  const slackBot = new SlackWebClient(team.botAccessToken);
  slackBot.chat.postMessage(channelId, "", {
    attachments: [attachment]
  });
};

const webhook = {
  process(req, res) {
    const event = req.body;
    console.log("Incoming DW webhook event : ", event);
    res.status(200).send();
    // process event based on type
    switch (getEntityType(event)) {
      case DATASET:
        handleDatasetEvent(event);
        break;
      case INSIGHT:
        handleInsightEvent(event);
        break;
      case FILE:
        handleFileEvents(event);
        break;
      default:
        console.warn("Received unknown dw webhook event : ", req.body);
        break;
    }
  }
};

module.exports = { webhook };
