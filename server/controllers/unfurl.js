const array = require("lodash/array");
const lang = require("lodash/lang");
const collection = require("lodash/collection");
const object = require("lodash/object");

const Channel = require("../models").Channel;
const Team = require("../models").Team;

const SlackWebClient = require("@slack/client").WebClient;
const { auth } = require("./auth");
const { dataworld } = require("../api/dataworld");
const { helper } = require("../util/helper");

const DATASET = "dataset";
const INSIGHT = "insight";
const INSIGHTS = "insights";
const datasetLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+)$/i;
const insightsLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+\/insights)$/i;
const insightLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+\/insights\/[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/i;

const messageAttachmentFromLink = (token, link) => {
  let url = link.url;
  let type = getType(url);
  let params = {};

  switch (type) {
    case DATASET:
      params = helper.extractDatasetOrProjectParams(url);
      params.token = token;
      return unfurlDataset(params);
    case INSIGHT:
      params = helper.extractInsightParams(url);
      params.token = token;
      return unfurlInsight(params);
    case INSIGHTS:
      params = helper.extractInsightsParams(url);
      params.token = token;
      return unfurlInsights(params);
    default:
      //Link type is not supported.
      console.warn("Can't unfold unsupported link type : ", url);
      break;
  }
};

const getType = link => {
  // determine type of link
  if (datasetLinkFormat.test(link)) {
    return DATASET;
  } else if (insightLinkFormat.test(link)) {
    return INSIGHT;
  } else if (insightsLinkFormat.test(link)) {
    return INSIGHTS;
  }
  return;
};

const unfurlDataset = params => {
  // Fetch resource info from DW
  return dataworld
    .getDataset(params.datasetId, params.owner, params.token)
    .then(response => {
      const dataset = response.data;
      //Check if it's a project object.
      if (dataset.isProject) {
        return unfurlProject(params);
      }

      let owner = dataset.owner;
      const attachment = {
        fallback: dataset.title,
        color: "#5CC0DE",
        pretext: dataset.title,
        author_name: owner,
        author_link: `http://data.world/${owner}`,
        title: dataset.description,
        title_link: params.link,
        text: dataset.summary,
        footer: `${params.owner}/${params.datasetId}`,
        footer_icon: "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT",
        mrkdwn_in: ["fields"],
        actions: [
          {
            type: "button",
            text: "Explore :microscope:",
            url: `https://data.world/${params.owner}/${
              params.datasetId
            }/workspace`
          }
        ],
        url: params.link
      };
      const fields = [];

      const files = dataset.files;
      if (!lang.isEmpty(files)) {
        let fieldValue = "";
        collection.forEach(files, file => {
          fieldValue += `• <https://data.world/${params.owner}/${
            params.datasetId
          }/workspace/file?filename=${file.name}|${file.name}> _(${(
            file.sizeInBytes / 1024
          ).toFixed(2)}KB)_\n`;
        });

        fields.push({
          title: files.length > 1 ? "Files" : "File",
          value: fieldValue,
          short: false
        });
      } else {
        fields.push({
          title: "File(s)",
          value: `_none found_\n_need some ?_\n_be the first to <https://data.world/${
            params.owner
          }/${params.datasetId}|add one>_`
        });
      }

      const tags = dataset.tags;
      if (!lang.isEmpty(tags)) {
        let fieldValue = "";
        collection.forEach(tags, tag => {
          fieldValue += `\`${tag}\` `;
        });
        fields.push({
          title: tags.length > 1 ? "Tags" : "Tag",
          value: fieldValue,
          short: false
        });
      }

      if (dataset.visibility) {
        fields.push({
          title: "Visibility",
          value: lang.toString(dataset.visibility),
          short: true
        });
      }

      if (dataset.license) {
        fields.push({
          title: "License",
          value: lang.toString(dataset.license),
          short: true
        });
      }

      if (fields.length > 0) {
        attachment.fields = fields;
      }

      return attachment;
    })
    .catch(error => {
      console.error("failed to get dataset attachment : ", error.message);
      return;
    });
};

const unfurlProject = params => {
  // Fetch resource info from DW
  return dataworld
    .getProject(params.datasetId, params.owner, params.token)
    .then(response => {
      const project = response.data;
      let owner = project.owner;
      const attachment = {
        fallback: project.title,
        color: "#F6BD68",
        pretext: project.title,
        author_name: owner,
        author_link: `http://data.world/${owner}`,
        title: project.objective,
        title_link: params.link,
        text: project.summary,
        footer: `${params.owner}/${params.datasetId}`,
        footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
        mrkdwn_in: ["fields"],
        actions: [
          {
            type: "button",
            text: "Learn more :nerd_face:",
            url: `http://data.world/${params.owner}/${params.datasetId}`
          },
          {
            type: "button",
            text: "Discuss :left_speech_bubble:",
            url: `http://data.world/${params.owner}/${params.datasetId}/discuss`
          },
          {
            type: "button",
            text: "Contribute :muscle:",
            url: `http://data.world/${params.owner}/${
              params.datasetId
            }/workspace`
          }
        ],
        url: params.link
      };
      const fields = [];

      if (lang.isEmpty(project.linkedDatasets)) {
        const files = project.files;
        if (!lang.isEmpty(files)) {
          let fieldValue = "";
          collection.forEach(files, file => {
            fieldValue += `• <https://data.world/${params.owner}/${
              params.datasetId
            }/workspace/file?filename=${file.name}|${file.name}> _(${(
              file.sizeInBytes / 1024
            ).toFixed(2)}KB)_\n`;
          });

          fields.push({
            title: files.length > 1 ? "Files" : "File",
            value: fieldValue,
            short: false
          });
        } else {
          fields.push({
            title: "File(s)",
            value: `_none found_\n_need some ?_\n_be the first to <https://data.world/${
              params.owner
            }/${params.datasetId}|add one>_`
          });
        }
      } else {
        // there are linked datasets
        const linkedDatasets = project.linkedDatasets;
        let fieldValue = "";
        collection.forEach(linkedDatasets, linkedDataset => {
          fieldValue += `• <https://data.world/${params.owner}/${
            params.datasetId
          }/workspace/dataset?datasetid=${
            linkedDataset.id
          }|${linkedDataset.description || linkedDataset.title}>\n`;
        });

        fields.push({
          title:
            linkedDatasets.length > 1 ? "Linked datasets" : "Linked dataset",
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
          title: tags.length > 1 ? "Tags" : "Tag",
          value: fieldValue,
          short: true
        });
      }

      if (project.license) {
        fields.push({
          title: "License",
          value: lang.toString(project.license),
          short: true
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

const unfurlInsights = params => {
  // Fetch resource info from DW
  return dataworld
    .getInsights(params.projectId, params.owner, params.token)
    .then(response => {
      const insights = response.data;
      if (insights.count > 0) {
        return getInsightsAttachment(insights.records, params);
      }
      return;
    })
    .catch(error => {
      console.error("failed to fetch insights : ", error.message);
      return;
    });
};

const unfurlInsight = params => {
  // Fetch resource info from DW
  return dataworld
    .getInsight(params.insightId, params.projectId, params.owner, params.token)
    .then(response => {
      const insight = response.data;
      return getInsightAttachment(insight, params);
    })
    .catch(error => {
      console.error("failed to fetch insight : ", error.message);
      throw error;
    });
};

const getInsightsAttachment = (insights, params) => {
  return dataworld
    .getProject(params.projectId, params.owner, params.token)
    .then(projectResponse => {
      const project = projectResponse.data;
      const attachment = {
        fallback: project.title,
        color: "#9581CA",
        author_name: params.owner,
        author_link: `http://data.world/${params.owner}`,
        title: project.title,
        title_link: params.link,
        text: project.objective,
        footer: `${params.owner}/${params.projectId}/insights`,
        footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
        url: params.link
      };

      const fields = [];

      if (!lang.isEmpty(insights)) {
        let fieldValue = "";
        collection.forEach(insights, insight => {
          fieldValue += `• <https://data.world/${params.owner}/${
            params.projectId
          }/insights/${insight.id}|${insight.title}>\n`;
        });

        fields.push({
          title: insights.length > 1 ? "Insights" : "Insight",
          value: fieldValue,
          short: false
        });
      }

      if (!lang.isEmpty(fields)) {
        attachment.fields = fields;
      }

      return attachment;
    })
    .catch(error => {
      console.error("failed to unfurl insights : ", error.message);
      return;
    });
};

const getInsightAttachment = (insight, params) => {
  let author = insight.author;
  const attachment = {
    fallback: insight.title,
    color: "#9581CA",
    author_name: author,
    author_link: `http://data.world/${author}`,
    title: insight.title,
    title_link: params.link,
    text: insight.description,
    image_url: insight.thumbnail,
    footer: `${author}/${params.projectId}/insights/${insight.id}`,
    footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
    url: params.link,
    actions: [
      {
        type: "button",
        text: "Discuss :left_speech_bubble:",
        url: `https://data.world/${author}/${params.projectId}/insights/${
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
      let token = user.dwAccessToken;
      const team = await Team.findOne({ where: { teamId: teamId } });
      const slack = new SlackWebClient(
        process.env.SLACK_TEAM_TOKEN || team.accessToken
      );
      // User is associated, carry on and unfold url
      // retrieve user dw access token
      Promise.all(event.links.map(messageAttachmentFromLink.bind(null, token)))
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
  //add channel if not existing
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

      let event = req.body.event;
      console.log("Recieved new event from slack : ", event);
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
