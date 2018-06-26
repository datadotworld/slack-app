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
const SlackWebClient = require("@slack/client").WebClient;

const lang = require("lodash/lang");
const collection = require("lodash/collection");
const object = require("lodash/object");
const pretty = require("prettysize");
const moment = require("moment");

const { auth } = require("./auth");
const { dataworld } = require("../api/dataworld");
const { helper, FILES_LIMIT, LINKED_DATASET_LIMIT } = require("../util/helper");

const dwLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+).+/i;
const insightLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+\/insights\/[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/i;

const messageAttachmentFromLink = (token, channel, link) => {
  const url = link.url;
  let params = {};

  if (insightLinkFormat.test(url)) {
    params = helper.extractInsightParams(url);
    params.token = token;
    return unfurlInsight(params);
  } else if (dwLinkFormat.test(url)) {
    params = helper.extractDatasetOrProjectParams(url);
    params.token = token;
    return unfurlDatasetOrProject(params, channel);
  } else {
    console.warn("Can't unfold unsupported link type : ", url);
    return;
  }
};

const unfurlDatasetOrProject = (params, channelId) => {
  // Fetch resource info from DW
  return dataworld
    .getDataset(params.datasetId, params.owner, params.token)
    .then(async response => {
      const dataset = response.data;
      const resourceId = `${params.owner}/${params.datasetId}`;
      //check if there's an active subscription for this resource in the channel
      const subscription = await Subscription.findOne({
        where: { resourceId: resourceId, channelId: channelId }
      });
      const notSubscribed = subscription ? false : true;
      const ownerResponse = await dataworld.getDWUser(
        params.token,
        params.owner
      );
      const owner = ownerResponse.data;
      if (dataset.isProject) {
        return unfurlProject(params, owner, notSubscribed);
      } else {
        return unfurlDataset(params, dataset, owner, notSubscribed);
      }
    })
    .catch(error => {
      console.error("failed to get dataset attachment : ", error.message);
      return;
    });
};

const unfurlDataset = (params, dataset, owner, notSubscribed) => {
  const resourceId = `${params.owner}/${params.datasetId}`;
  //Check if it's a project object.
  const offset = moment(
    dataset.updated,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(dataset.updated, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();

  const attachment = {
    fallback: dataset.title,
    color: "#5CC0DE",
    title: dataset.title,
    title_link: params.link,
    text: dataset.description,
    thumb_url:
      owner.avatarUrl ||
      "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
    footer: `${resourceId}`,
    footer_icon: "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT",
    ts: ts,
    callback_id: "dataset_subscribe_button",
    mrkdwn_in: ["fields"],
    actions: [
      {
        type: "button",
        text: "Explore :microscope:",
        url: `https://data.world/${resourceId}/workspace`
      }
    ],
    url: params.link
  };

  if (notSubscribed) {
    attachment.actions.push({
      name: "subscribe",
      text: "Subscribe :nerd_face:",
      style: "primary",
      type: "button",
      value: `${resourceId}`
    });
  }

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

  const files = dataset.files;
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

  if (fields.length > 0) {
    attachment.fields = fields;
  }
  return attachment;
};

const unfurlProject = (params, owner, notSubscribed) => {
  // Fetch resource info from DW
  return dataworld
    .getProject(params.datasetId, params.owner, params.token)
    .then(async response => {
      const project = response.data;
      const resourceId = `${params.owner}/${params.datasetId}`;

      const offset = moment(
        project.updated,
        "YYYY-MM-DDTHH:mm:ss.SSSSZ"
      ).utcOffset();
      const ts = moment(project.updated, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
        .utcOffset(offset)
        .unix();
      const attachment = {
        fallback: project.title,
        color: "#F6BD68",
        title: project.title,
        title_link: params.link,
        text: project.objective,
        footer: `${resourceId}`,
        footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
        thumb_url:
          owner.avatarUrl ||
          "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
        ts: ts,
        mrkdwn_in: ["fields"],
        callback_id: "dataset_subscribe_button",
        actions: [
          {
            type: "button",
            text: "Explore :microscope:",
            url: `https://data.world/${resourceId}/workspace`
          }
        ],
        url: params.link
      };

      if (notSubscribed) {
        attachment.actions.push({
          name: "subscribe",
          text: "Subscribe :nerd_face:",
          style: "primary",
          type: "button",
          value: `${resourceId}`
        });
      }

      const fields = [];

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
          title:
            linkedDatasets.length > 1 ? "Linked datasets" : "Linked dataset",
          value: fieldValue,
          short: false
        });
      }

      if (fields.length > 0) {
        attachment.fields = fields;
      }

      return attachment;
    })
    .catch(error => {
      console.error("failed to get project attachment : ", error.message);
      throw error;
    });
};

const unfurlInsight = params => {
  // Fetch resource info from DW
  return dataworld
    .getInsight(params.insightId, params.projectId, params.owner, params.token)
    .then(async response => {
      const ownerResponse = await dataworld.getDWUser(
        params.token,
        params.owner
      );
      const owner = ownerResponse.data;
      const insight = response.data;
      return getInsightAttachment(insight, owner, params);
    })
    .catch(error => {
      console.error("failed to fetch insight : ", error.message);
      throw error;
    });
};

const getInsightAttachment = (insight, owner, params) => {
  let author = insight.author;
  const attachment = {
    fallback: insight.title,
    color: "#9581CA",
    author_name: author,
    author_link: `http://data.world/${author}`,
    author_icon: owner.avatarUrl,
    title: insight.title,
    title_link: params.link,
    text: insight.description,
    image_url: insight.thumbnail,
    footer: `${params.owner}/${params.projectId}/insights/${insight.id}`,
    footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
    url: params.link,
    actions: [
      {
        type: "button",
        text: "Discuss :left_speech_bubble:",
        url: `https://data.world/${params.owner}/${params.projectId}/insights/${
          insight.id
        }`
      }
    ]
  };
  if (insight.body.imageUrl) {
    attachment.imageUrl = insight.body.imageUrl;
  }

  return attachment;
};

const handleLinkSharedEvent = async (event, teamId) => {
  // verify slack associaton
  try {
    const [isAssociated, user] = await auth.checkSlackAssociationStatus(
      event.user
    );
    if (isAssociated) {
      // User is associated, carry on and unfold url
      let token = user.dwAccessToken;
      const team = await Team.findOne({ where: { teamId: teamId } });
      const slack = new SlackWebClient(
        process.env.SLACK_TEAM_TOKEN || team.accessToken
      );
      // retrieve user dw access token
      Promise.all(
        event.links.map(
          messageAttachmentFromLink.bind(null, token, event.channel)
        )
      )
        // Transform the array of attachments to an unfurls object keyed by URL
        .then(attachments => collection.keyBy(attachments, "url")) // group by url
        .then(unfurls =>
          object.mapValues(unfurls, attachment =>
            object.omit(attachment, "url")
          )
        ) // remove url from attachment object
        // Invoke the Slack Web API to append the attachment
        .then(unfurls =>
          slack.chat.unfurl(event.message_ts, event.channel, unfurls)
        )
        .catch(console.error);
    } else {
      // User is not associated, begin association for unfurl
      auth.beginUnfurlSlackAssociation(
        event.user,
        event.message_ts,
        event.channel,
        teamId
      );
    }
  } catch (error) {
    console.error(
      "Failed to verify slack association status during link unfurl : ",
      error
    );
  }
};

const handleJoinedChannelEvent = event => {
  // Update known channel
  // Add channel if not existing
  // create user with nonce and the slackdata
  Channel.findOrCreate({
    where: { channelId: event.channel },
    defaults: { teamId: event.team, slackUserId: event.inviter }
  })
    .spread((channel, created) => {
      if (!created) {
        // Channel record already exits.
        console.warn("Channel record already exists : ", event);
      }
    })
    .catch(error => {
      // error creating user
      console.error("Failed to create new channel record : " + error.message);
      throw error;
    });
};

const unfurl = {
  processRequest(req, res) {
    if (req.body.challenge) {
      // Respond to slack challenge.
      res.status(200).send({ challenge: req.body.challenge });
    } else {
      // respond to request immediately no need to wait.
      res.json({ response_type: "in_channel" });

      const event = req.body.event;
      switch (event.type) {
        case "link_shared":
          handleLinkSharedEvent(event, req.body.team_id);
          break;
        case "member_joined_channel":
          handleJoinedChannelEvent(event);
          break;
        default:
          break;
      }
    }
  }
};

module.exports = { unfurl };
