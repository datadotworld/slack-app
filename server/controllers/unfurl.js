const array = require("lodash/array");
const lang = require("lodash/lang");
const collection = require("lodash/collection");
const object = require("lodash/object");
const moment = require("moment");

const Channel = require("../models").Channel;
const Team = require("../models").Team;

const SlackWebClient = require("@slack/client").WebClient;
const { auth } = require("./auth");
const { dataworld } = require("../api/dataworld");
const { helper } = require("../util/helper");

const dwLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+).+/i;
const insightLinkFormat = /^(https:\/\/data.world\/[\w-]+\/[\w-]+\/insights\/[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/i;

const messageAttachmentFromLink = (token, link) => {
  let url = link.url;
  let params = {};

  if (insightLinkFormat.test(url)) {
    params = helper.extractInsightParams(url);
    params.token = token;
    return unfurlInsight(params);
  } else if (dwLinkFormat.test(url)) {
    params = helper.extractDatasetOrProjectParams(url);
    params.token = token;
    return unfurlDatasetOrProject(params);
  } else {
    console.warn("Can't unfold unsupported link type : ", url);
    return;
  }
};

const unfurlDatasetOrProject = params => {
  // Fetch resource info from DW
  return dataworld
    .getDataset(params.datasetId, params.owner, params.token)
    .then(async response => {
      const dataset = response.data;
      if (dataset.isProject) {
        return unfurlProject(params);
      }

      const ownerResponse = await dataworld.getDWUser(
        params.token,
        params.owner
      );
      const owner = ownerResponse.data;
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
        title: dataset.description,
        title_link: params.link,
        text: dataset.summary,
        thumb_url:
          owner.avatarUrl ||
          "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
        footer: `${params.owner}/${params.datasetId}`,
        footer_icon: "https://cdn.filepicker.io/api/file/QXyEdeNmSqun0Nfy4urT",
        ts: ts,
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
    .then(async response => {
      const project = response.data;

      const ownerResponse = await dataworld.getDWUser(
        params.token,
        params.owner
      );
      const owner = ownerResponse.data;

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
        footer: `${params.owner}/${params.datasetId}`,
        footer_icon: "https://cdn.filepicker.io/api/file/N5PbEQQ2QbiuK3s5qhZr",
        thumb_url:
          owner.avatarUrl ||
          "https://cdn.filepicker.io/api/file/h9MLETR6Sv6Tq5WY1cyt",
        ts: ts,
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
