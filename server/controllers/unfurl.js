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
const Team = require("../models").Team;
const User = require("../models").User;

const lang = require("lodash/lang");
const collection = require("lodash/collection");
const object = require("lodash/object");
const pretty = require("prettysize");
const moment = require("moment");

const auth = require("./auth");
const dataworld = require("../api/dataworld");
const helper = require("../helpers/helper");
const slack = require("../api/slack");
const { getBotAccessTokenForTeam } = require("../helpers/tokens");
const dwDomain = helper.DW_DOMAIN;

const dwLinkFormat = new RegExp(
  `^(https:\/\/${dwDomain}\/[\\w-]+\/[\\w-]+).*`,
  "i"
);

const insightLinkFormat = new RegExp(
  `^(https:\/\/${dwDomain}\/[\\w-]+\/[\\w-]+\/insights\/[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$`,
  "i"
);

const queryLinkFormat = new RegExp(
  `^(https:\/\/${dwDomain}\/[\\w-]+\/[\\w-]+\/workspace\/query\\?queryid=[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$`,
  "i"
);

const messageAttachmentFromLink = async (
  token,
  channel,
  serverBaseUrl,
  link
) => {
  const url = link.url;
  let params = {};
  if (insightLinkFormat.test(url)) {
    params = helper.extractInsightParams(url);
    params.token = token;
    return unfurlInsight(params, serverBaseUrl);
  } else if (queryLinkFormat.test(url)) {
    const params = helper.extractQueryParams(url);
    return await unfurlQuery(params, token, serverBaseUrl);
  } else if (dwLinkFormat.test(url)) {
    params = helper.extractDatasetOrProjectParamsFromLink(url);
    params.token = token;
    return await unfurlDatasetOrProject(params, channel, serverBaseUrl);
  } else {
    console.warn("Can't unfold unsupported link type : ", url);
    return;
  }
};

const unfurlDatasetOrProject = async (params, channelId, serverBaseUrl) => {
  // Fetch resource info from DW
  try {
    const response = await dataworld.getDataset(
      params.datasetId,
      params.owner,
      params.token
    );
    const dataset = response.data;
    const resourceId = `${params.owner}/${params.datasetId}`;
    //check if there's an active subscription for this resource in the channel
    const subscription = await Subscription.findOne({
      where: { resourceId: resourceId, channelId: channelId }
    });
    const addSubcribeAction = subscription ? false : true;
    const ownerResponse = await dataworld.getDWUser(params.token, params.owner);
    const owner = ownerResponse.data;
    if (dataset.isProject) {
      return await unfurlProject(
        params,
        owner,
        addSubcribeAction,
        serverBaseUrl
      );
    } else {
      return unfurlDataset(
        params,
        dataset,
        owner,
        addSubcribeAction,
        serverBaseUrl
      );
    }
  } catch (error) {
    console.error("failed to get dataset attachment : ", error.message);
    return;
  }
};

const unfurlDataset = (
  params,
  dataset,
  owner,
  addSubcribeAction,
  serverBaseUrl
) => {
  const resourceId = `${params.owner}/${params.datasetId}`;
  //Check if it's a project object.
  const ts = getTimestamp(dataset);
  const fields = [];

  const files = dataset.files;
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

  let blockText = `<${params.link}|${dataset.title}>\n`

  if (!lang.isEmpty(fields)) {
    collection.forEach(fields, field => {
      blockText += `${field.title}\n${field.value}\n`
    })
  }
  
  const actions = {
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Explore :microscope:",
        },
        "url": `https://${dwDomain}/${resourceId}/workspace`
      }
    ]
  }

  if (addSubcribeAction) {
    actions.elements.push({
      "type": "button",
      "action_id": "dataset_subscribe_button",
      "style": "primary",
      "text": {
        "type": "plain_text",
        "text": "Subscribe"
      },
      "value": `${resourceId}`
    });
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
        "image_url": owner.avatarUrl || `${serverBaseUrl}/assets/avatar.png`,
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
    actions
  ]

  const unfurlBlocks = { blocks: blocks, url: params.link }
  return unfurlBlocks;
};

const unfurlProject = async (
  params,
  owner,
  addSubcribeAction,
  serverBaseUrl
) => {
  // Fetch resource info from DW
  try {
    const response = await dataworld.getProject(
      params.datasetId,
      params.owner,
      params.token
    );
    const project = response.data;
    const resourceId = `${params.owner}/${params.datasetId}`;
    const ts = getTimestamp(project);
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

    let blockText = `<${params.link}|${project.title}>\n`

    if (!lang.isEmpty(fields)) {
      collection.forEach(fields, field => {
        blockText += `${field.title}\n${field.value}\n`
      })
    }

    const actions = {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Explore :microscope:",
          },
          "url": `https://${dwDomain}/${resourceId}/workspace`
        }
      ]
    }

    if (addSubcribeAction) {
      actions.elements.push({
        "type": "button",
        "action_id": "dataset_subscribe_button",
        "style": "primary",
        "text": {
          "type": "plain_text",
          "text": "Subscribe"
        },
        "value": `${resourceId}`
      });
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
          "image_url": owner.avatarUrl || `${serverBaseUrl}/assets/avatar.png`,
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
      actions
    ]

    const unfurlBlocks = { blocks: blocks, url: params.link }
    return unfurlBlocks;
  } catch (error) {
    console.error("failed to get project attachment : ", error.message);
    return;
  }
};

const unfurlInsight = (params, serverBaseUrl) => {
  // Fetch resource info from DW
  return dataworld
    .getInsight(params.insightId, params.projectId, params.owner, params.token)
    .then(async response => {
      const insight = response.data;
      const authorResponse = await dataworld.getDWUser(
        params.token,
        insight.author
      );
      const author = authorResponse.data;
      return getInsightUnfurlBlocks(insight, author, params, serverBaseUrl);
    })
    .catch(error => {
      console.error("failed to fetch insight : ", error.message);
      throw error;
    });
};

const unfurlQuery = async (params, token, serverBaseUrl) => {
  // Fetch resource info from DW
  try {
    const datasetResponse = await dataworld.getDataset(
      params.datasetId,
      params.owner,
      params.token
    );
    const queryResponse = await dataworld.getQuery(params.queryId, token);
    const dataset = datasetResponse.data;
    const query = queryResponse.data;

    const ownerResponse = await dataworld.getDWUser(params.token, query.owner);

    const owner = ownerResponse.data;

    return getQueryUnfurlBlocks(
      query,
      owner,
      params,
      dataset.isProject,
      serverBaseUrl
    );
  } catch (error) {
    console.error("failed to get query attachment : ", error.message);
    return;
  }
};

const getInsightUnfurlBlocks = (insight, author, params, serverBaseUrl) => {
  const ts = getTimestamp(insight);
  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*<http://${dwDomain}/${author.id}|${author.displayName}>*\n<${params.link}|${insight.title}>\n${insight.description}`
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
          "text": `<!date^${ts}^${params.owner}/${params.projectId}  {date_short_pretty} at {time}|${params.owner}/${params.projectId}>`
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
          "url": params.link
        }
      ]
    }]

  const unfurlBlocks = { blocks: blocks, url: params.link }
  return unfurlBlocks;
};

const getQueryUnfurlBlocks = (query, owner, params, isProject, serverBaseUrl) => {
  const ts = getTimestamp(query);
  const isSql = query.language === "SQL";
  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*<http://${dwDomain}/${owner.id}|${owner.displayName}>*\n<${params.link}|${query.name}>\n\`\`\`${query.body}\`\`\`\n`
      },
      "accessory": {
        "type": "image",
        "image_url": isSql
          ? `${serverBaseUrl}/assets/icon-sql.png`
          : `${serverBaseUrl}/assets/icon-sparql.png`,
        "alt_text": "avatar"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": isProject
            ? `${serverBaseUrl}/assets/project.png`
            : `${serverBaseUrl}/assets/dataset.png`,
          "alt_text": isProject ? "project" : "dataset"
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
            "text": "Run query :zap:",
          },
          "url": params.link
        }
      ]
    }
  ]

  const unfurlBlocks= { blocks: blocks, url: params.link }
  return unfurlBlocks;
};

const handleLinkSharedEvent = async (event, teamId, serverBaseUrl) => {
  // verify slack associaton
  try {
    if (verifyLink(event.links)) {
      const team = await Team.findOne({ where: { teamId: teamId } });
      const [isAssociated, user] = await auth.checkSlackAssociationStatus(
        event.user
      );
      if (isAssociated) {
        // User is associated, carry on and unfold url
        let token = user.dwAccessToken;
        const teamToken = process.env.SLACK_TEAM_TOKEN || team.accessToken;

        const botToken = await getBotAccessTokenForTeam(team.teamId);

        Promise.all(
          event.links.map(
            messageAttachmentFromLink.bind(
              null,
              token,
              event.channel,
              serverBaseUrl
            )
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
            slack.sendUnfurlAttachments(
              event.message_ts,
              event.channel,
              unfurls,
              botToken
            )
          )
          .catch(console.error);
      } else {
        // User is not associated, begin association for unfurl
        auth.beginUnfurlSlackAssociation(
          event.user,
          event.channel,
          teamId,
          event.message_ts
        );
      }
    } else {
      console.log(
        "INFO: unsupported data.world links : ",
        JSON.stringify(event.links)
      );
    }
  } catch (error) {
    console.error(
      "Failed to verify slack association status during link unfurl : ",
      error
    );
  }
};

const verifyLink = links => {
  return links.some(linkObj => {
    return dwLinkFormat.test(linkObj.url);
  });
};

const handleJoinedChannelEvent = async event => {
  // Update known channel
  // Add channel if not existing
  // create user with nonce and the slackdata
  try {
    const [channel, created] = await Channel.findOrCreate({
      where: { channelId: event.channel },
      defaults: { teamId: event.team, slackUserId: event.inviter }
    });
    if (!created) {
      // Channel record already exits.
      console.warn("Channel record already exists : ", event);
    }
  } catch (error) {
    console.error("Failed to create new channel record : " + error.message);
  }
};

const handleMessage = async data => {
  // Send helpful info to user whenever we receive any message that's not a valid slash command or DW link
  try {
    const { event, team_id } = data;
    const message = event.text ? event.text : "";
    const dwLinkFormat = new RegExp(
      `(<https:\/\/${dwDomain}\/[\\w-]+\/[\\w-]+).*>`,
      "i"
    );
    const command = `/${process.env.SLASH_COMMAND}`;
    const ignoredSubTypes = ["bot_message", "message_deleted"];
    const isBotMessage =
      event.bot_id ||
      (event.subtype && ignoredSubTypes.includes(event.subtype));
    if (
      isBotMessage ||
      dwLinkFormat.test(message) ||
      message.startsWith(command)
    ) {
      return;
    }
    const team = await Team.findOne({ where: { teamId: team_id } });
    const botAccessToken = process.env.SLACK_BOT_TOKEN || team.botAccessToken;
    await slack.sendHowToUseMessage(botAccessToken, event.user);
  } catch (error) {
    console.error("Failed to handle dm message event : " + error.message);
  }
};

const handleAppUninstalledEvent = async data => {
  // Do record clean up
  try {
    // get all users in this team
    const users = await User.findAll({
      where: { teamId: data.team_id }
    });

    await Promise.all(
      users.map(async user => {
        // delete subscriptions for each user
        // delete from DB
        await Subscription.destroy({
          where: { slackUserId: user.slackId }
        });
        // delete the user
        await User.destroy({
          where: { slackId: user.slackId }
        });
      })
    );
    // Delete team record
    await Team.destroy({ where: { teamId: data.team_id } });
    console.log("Successfully cleaned up data!!!");
  } catch (error) {
    console.error("Clean up failed after app was uninstalled!", error);
  }
};

const getTimestamp = resource => {
  const offset = moment(
    resource.updated,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(resource.updated, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  return ts;
};

const unfurl = {
  async processRequest(req, res) {

    // respond to request immediately no need to wait.
    res.json({ response_type: "in_channel" });
    const event = req.body.event;
    const serverBaseUrl = helper.getServerBaseUrl(req);
    console.log("event recieved", event)
    switch (event.type) {
      case "link_shared":
        await handleLinkSharedEvent(event, req.body.team_id, serverBaseUrl);
        break;
      case "member_joined_channel":
        await handleJoinedChannelEvent(event);
        break;
      case "app_uninstalled":
        await handleAppUninstalledEvent(req.body);
        break;
      case "message":
        await handleMessage(req.body);
        break;
      default:
        break;
    }
  }
};

module.exports = { unfurl };
