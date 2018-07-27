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
"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      slackId: {
        allowNull: false,
        type: DataTypes.STRING
      },
      teamId: {
        type: DataTypes.STRING
      },
      teamDomain: {
        type: DataTypes.STRING
      },
      nonce: {
        allowNull: false,
        type: DataTypes.STRING
      },
      dwUserId: {
        type: DataTypes.TEXT
      },
      dwAccessToken: {
        type: DataTypes.TEXT
      },
      dwRefreshToken: {
        type: DataTypes.STRING
      },
      dwRefreshToken: {
        type: DataTypes.TEXT
      },
      dwTokenExpiresAt: {
        type: DataTypes.DATE
      }
    },
    {}
  );
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
