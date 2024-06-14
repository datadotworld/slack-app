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

const lang = require('lodash/lang')

const dataworld = require('../api/dataworld')
const helper = require('../helpers/helper')
const slack = require('../api/slack')
const moment = require("moment");

// data.world command format
const dwDomain = helper.DW_DOMAIN

const getTimestamp = time => {
  const offset = moment(
    time,
    "YYYY-MM-DDTHH:mm:ss.SSSSZ"
  ).utcOffset();
  const ts = moment(time, "YYYY-MM-DDTHH:mm:ss.SSSSZ")
    .utcOffset(offset)
    .unix();
  return ts;
};

// This method handles subscription to projects and datasets
const searchTerm = async (token, query, size, responseUrl) => {
  try {
    const { data } = await dataworld.searchTerm(token, query, size);
    if (data.records.length) {
      const term = data.records[0];
      const ownerResponse = await dataworld.getDWUser(token, term.owner);
      const owner = ownerResponse.data;
      const serverBaseUrl = 'https://major-cougar-adequately.ngrok-free.app';

      const ts = getTimestamp(term.updated);
      const createdTs = getTimestamp(term.created);

      const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*<http://${dwDomain}/${owner.id}|${owner.displayName}>*\n\n<${term.resourceLink}|${term.title}>\n\n\`\`\`${term.description}\`\`\`\n`
          },
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Status:*\n ${term.assetStatus?.assetStatusLabel||'Unknown'}`
            },
            {
              "type": "mrkdwn",
              "text": `*Category:*\n ${term.category||'Unknown'}`
            },
            {
              "type": "mrkdwn",
              "text": `*Last Update:*\n <!date^${ts}^  {date_short_pretty} at {time}|Unknown>`
            },
            {
              "type": "mrkdwn",
              "text": `*Created:*\n <!date^${createdTs}^  {date_short_pretty} at {time}|Unknown>`
            }
          ],
          "accessory": {
            "type": "image",
            "image_url": `${serverBaseUrl}/assets/dataset.png`,
            "alt_text": "avatar"
          }
        },
      {
        "type": "context",
        "elements": [
          {
            "type": "image",
            "image_url": `${serverBaseUrl}/assets/dataset.png`,
            "alt_text": "Business Term"
          },
          {
            "type": "mrkdwn",
            "text": `${term.owner}/${term.id}`
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
                "text": "View term :zap:",
              },
              "url": term.resourceLink
            }
          ]
        }
      ];
    
      await sendSlackMessage(
        responseUrl,
        `Found a matching term!`,
        blocks
      );
    } else {
      await sendSlackMessage(
        responseUrl,
        `No matching term found!`,
      )
    }
  } catch (error) {
    // TODO: Move to message service or slack service 
    console.warn('Search term request failure : ', error.message)
    await sendSlackMessage(
      responseUrl,
      `Search term request failed, try again later.`,
    )
  }
}

const sendSlackMessage = async (
  responseUrl,
  message,
  blocks,
  replaceOriginal,
  deleteOriginal,
) => {
  let data = { text: message }
  if (blocks && !lang.isEmpty(blocks)) {
    data.blocks = blocks
  }
  data.replace_original = replaceOriginal ? replaceOriginal : true
  data.delete_original = deleteOriginal ? deleteOriginal : true
  try {
    await slack.sendResponse(responseUrl, data)
  } catch (error) {
    console.error('Failed to send message to slack', error.message)
  }
}

// Visible for testing
module.exports = {
  searchTerm
}
