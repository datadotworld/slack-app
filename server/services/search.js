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

const dataworld = require('../api/dataworld')
const helper = require('../helpers/helper')
const { getBotAccessTokenForTeam } = require('../helpers/tokens')
const slack = require('../api/slack')
const moment = require("moment");

// data.world command format
const dwDomain = helper.DW_DOMAIN
const serverBaseUrl = `${process.env.SERVER_PUBLIC_HOSTNAME}`;

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

const searchTerm = async (token, query, size, responseUrl) => {
  try {
    const { data } = await dataworld.searchTerm(token, query, size);
    if (data.records.length) {
      const term = data.records[0];
      const ownerResponse = await dataworld.getDWUser(token, term.owner);
      const owner = ownerResponse.data;

      const ts = getTimestamp(term.updated);
      const createdTs = getTimestamp(term.created);

      const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*<http://${dwDomain}/${owner.id}|${owner.displayName}>*\n\n<${term.resourceLink}|${term.title}>\n\n\`\`\`${helper.trimStringToMaxLength(term.description, 2000)}\`\`\`\n`
          },
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Status:*\n ${term.assetStatus ? term.assetStatus.assetStatusLabel : 'Unknown'}`
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

      await slack.sendResponseMessageAndBlocks(
        responseUrl,
        `Found a matching term!`,
        blocks
      );
    } else {
      await slack.sendResponseMessageAndBlocks(
        responseUrl,
        `No matching term found!`,
      )
    }
  } catch (error) {
    // TODO: Move to message service or slack service 
    console.warn('Search term request failure : ', error.message)
    await slack.sendResponseMessageAndBlocks(
      responseUrl,
      `Search term request failed, try again later.`,
    )
  }
}

const getSearchBlocks = async (token, query, size, nextPage) => {
  try {
    const { data } = await dataworld.searchTerm(token, query, size, nextPage);

    if (data.records.length) {
      const { count, records, next } = data;

      const blocks = [
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": `Found ${count} matching term(s)`,
            "emoji": true
          }
        }
      ];

      for (const term of records) {
        const ownerResponse = await dataworld.getDWUser(token, term.owner);
        const owner = ownerResponse.data;  
        const ts = getTimestamp(term.updated);
        const createdTs = getTimestamp(term.created);

        const termBlocks = [
          {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*<http://${dwDomain}/${owner.id}|${owner.displayName}>*\n\n<${term.resourceLink}|${term.title}>\n\n\`\`\`${helper.trimStringToMaxLength(term.description, 2000)}\`\`\`\n`
          },
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Status:*\n ${term.assetStatus ? term.assetStatus.assetStatusLabel : 'Unknown'}`
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
        },
        {
          "type": "divider"
        }];

        blocks.push(...termBlocks)
      }

      const moreButton = {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "More",
          "emoji": true
        },
        "value": `${query} ${next}`,
        "action_id": "more_terms_button",
        "style": "primary"
      }

      const clearResultButton = {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Clear Result",
          "emoji": true
        },
        "value": "clear_search_results_button",
        "action_id": "clear_search_results_button",
        "style": "danger"
      }; 

      const footerBlock = [
        {
          "type": "actions",
          "elements": next ? [ moreButton, clearResultButton ] : [ clearResultButton ]
        }
      ]

      blocks.push(...footerBlock);
      return blocks;
    }
  } catch (error) {
    // TODO: Move to message service or slack service 
    console.warn('Search term request failure : ', error.message)
  }
}

const sendDefaultSearchHomeView = async (slackUserId, teamId) => {
  const { botToken } = await getBotAccessTokenForTeam(teamId);

  const blocks = [
		{
			"type": "input",
			"element": {
				"type": "plain_text_input",
				"action_id": "search-term-input-box"
			},
			"label": {
				"type": "plain_text",
				"text": ":mag: Search for terms",
				"emoji": true
			}
		},
		{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Search",
						"emoji": true
					},
					"value": "search_term_button",
					"action_id": "search_term_button",
					"style": "primary"
				}
			]
		}
	];

  await slack.publishAppHomeView(botToken, slackUserId, blocks);
}

// Visible for testing
module.exports = {
  searchTerm,
  getSearchBlocks,
  sendDefaultSearchHomeView
}
