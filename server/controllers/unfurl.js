const array = require('lodash/array');
const lang = require('lodash/lang');
const collection = require('lodash/collection');
const object = require('lodash/object');

const SlackWebClient = require('@slack/client').WebClient;
const { auth } = require("./auth");
const { dataworld } = require('../api/dataworld');

const slack = new SlackWebClient(process.env.SLACK_CLIENT_TOKEN);

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
      params = extractDatasetOrProjectParams(url);
      params.token = token;
      return unfurlDataset(params);
    case INSIGHT:
      params = extractInsightParams(url);
      params.token = token;
      return unfurlInsight(params);
    case INSIGHTS:
      params = extractInsightsParams(url);
      params.token = token;
      return unfurlInsights(params);
    default:
      //Link type is not supported.
      console.warn("Can't unfold unsupported link type : ", url);
      break;
  }
};

const getType = (link) => {
// determine type of link
    if (datasetLinkFormat.test(link)){
      return DATASET;
    } else if(insightLinkFormat.test(link)) {
      return INSIGHT;
    } else if(insightsLinkFormat.test(link)) {
      return INSIGHTS;
    } 
    return;
};

const extractDatasetOrProjectParams = (link) => {
   let params = {};
   let parts = link.split("/");

   params.datasetId = parts[parts.length - 1];
   params.owner = parts[parts.length - 2];
   params.link = link;

   return params;
};

//TODO : This needs to be refactored.
const extractInsightParams = (link) => {
  let params = {};
  let parts = link.split("/");

  params.insightId = parts[parts.length - 1];
  params.projectId = parts[parts.length - 3];
  params.owner = parts[parts.length - 4];
  params.link = link;

  return params;
};


//TODO : This needs to be refactored.
const extractInsightsParams = (link) => {
  let params = {};
  let parts = link.split("/");

  params.projectId = parts[parts.length - 2];
  params.owner = parts[parts.length - 3];
  params.link = link;

  return params;
};

const unfurlDataset = params => {
  // Fetch resource info from DW
  return dataworld
    .getDataset(params.datasetId, params.owner, params.token)
    .then(dataset => {
      //Check if it's a project object.
      if (dataset.isProject) {
        return unfurlProject(params);
      }

      let owner = dataset.owner;
      const attachment = {
        fallback: dataset.title,
        color: "#79B8FB",
        pretext: dataset.title,
        author_name: owner,
        author_link: `http://data.world/${owner}`,
        title: dataset.description,
        title_link: params.link,
        text: dataset.summary,
        footer: "Data.World",
        // we should change this to data.world logo
        footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png",
        url: params.link
      };
      const fields = [];

      if (dataset.visibility){
        fields.push({
          title: "Visibility",
          value: lang.toString(dataset.visibility),
          short: true
        });
      }

      if (dataset.files.length > 0) {
        fields.push({
          title: "Total files",
          value: dataset.files.length,
          short: true
        });
      }

      if (dataset.tags.length > 0) {
        fields.push({
          title: "Tags",
          value: lang.toString(dataset.tags),
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
      throw error;
    });
};

const unfurlProject = params => {
  // Fetch resource info from DW
  return dataworld
    .getProject(params.datasetId, params.owner, params.token)
    .then(project => {
      
      let owner = project.owner;
      const attachment = {
        fallback: project.title,
        color: "#79B8FB",
        pretext: project.title,
        author_name: owner,
        author_link: `http://data.world/${owner}`,
        title: project.objective,
        title_link: params.link,
        text: project.summary,
        footer: "Data.World",
        footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png",
        url: params.link
      };
      const fields = [];

      if (project.files.length > 0) {
        fields.push({
          title: "Total files",
          value: project.files.length,
          short: true
        });
      }

      if (project.tags.length > 0) {
        fields.push({
          title: "Tags",
          value: lang.toString(project.tags),
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
    .then(insights => {
      if (insights.count > 0) {
        let insight = insights.records[0];
        return getInsightAttachment(insight, params.link);
      }
      return;
    })
    .catch(error => {
      console.error("failed to fetch insights : ", error.message);
      throw error;
    });
};

const unfurlInsight = params => {
  // Fetch resource info from DW
  return dataworld
    .getInsight(params.insightId, params.projectId, params.owner, params.token)
    .then(insight => {
      return getInsightAttachment(insight, params.link);
    })
    .catch(error => {
      console.error("failed to fetch insight : ", error.message);
      throw error;
    });
};

const getInsightAttachment = (insight, link) => {
  let author = insight.author;
  let thumbUrl = insight.thumbnail || insight.body.imageUrl
  const attachment = {
    fallback: insight.title,
    color: "#79B8FB",
    author_name: author,
    author_link: `http://data.world/${author}`,
    title: insight.title,
    title_link: link,
    text: insight.description,
    thumb_url: thumbUrl,
    footer: "Data.World",
    footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png",
    url: link
  };
  if (insight.body.imageUrl) {
    attachment.imageUrl = insight.body.imageUrl;
  }

  return attachment;
}


const unfurl = {

  processRequest(req, res) {
    if(req.body.challenge) {
      // Respond to slack challenge.
      res.status(200).send({"challenge": req.body.challenge});
    } else {
      // respond to request immediately no need to wait.
      res.json({ response_type: "in_channel" });
      // verify slack associaton
      auth.checkSlackAssociationStatus(
        req.body.event.user,
        (error, isAssociated, user) => {
          if (error) {
            // An internal error has occured.
            return;
          } else {
            let event = req.body.event;
            if (isAssociated) {
              let token = user.dwAccessToken;
              // User is associated, carry on and unfold url
              // retrieve user dw access token
              Promise.all(event.links.map(messageAttachmentFromLink.bind(null, token)))
              // Transform the array of attachments to an unfurls object keyed by URL
              .then(attachments => collection.keyBy(attachments, 'url')) // group by url
              .then(unfurls => object.mapValues(unfurls, attachment => object.omit(attachment, 'url'))) // remove url from attachment object
              // Invoke the Slack Web API to append the attachment
              .then(unfurls => slack.chat.unfurl(event.message_ts, event.channel, unfurls))
              .catch(console.error);
              
            } else {
              // User is not associated, begin association for unfurl
              auth.beginUnfurlSlackAssociation(event.user, event.message_ts, event.channel, req.body.team_id);
            }
          }
        }
      );
    }
  }
};

module.exports = { unfurl };