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
const getAdditionalHelpText = commandText => {
  return `Looking for additional help? Try \`/${commandText} help\``;
};

const getAuthRequiredMessage = slackUsername => {
  return `Hello, ${slackUsername}! I think it\'s time we introduce ourselves. I\'m a bot that helps you access your internal protected resources on data.world.`;
};

const getAuthRequiredAttachment = associationUrl => {
  return {
    attachments: [
      {
        text: `<${associationUrl}|Click here> to introduce yourself to me by authenticating.`
      }
    ]
  };
};

const getCompleteAssociationMessage = slackUserId => {
  return `Well, it\'s nice to meet you, <@${slackUserId}>!. Thanks for completing authentication.`;
};

const getWelcomeMessage = commandText => {
  return (
    "You've successfully installed data.world on this Slack workspace :tada: \n" +
    "To subscribe a channel to an account, dataset or project use either of the following slash commands: \n" +
    `• _/${commandText} subscribe account_ \n` +
    `• _/${commandText} subscribe owner/dataset_ \n` +
    `• _/${commandText} subscribe owner/project_`
  );
};

module.exports = {
    getAdditionalHelpText,
    getAuthRequiredMessage,
    getAuthRequiredAttachment,
    getCompleteAssociationMessage,
    getWelcomeMessage
  };
