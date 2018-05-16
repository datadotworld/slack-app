"use strict";
module.exports = (sequelize, DataTypes) => {
  var Team = sequelize.define(
    "Team",
    {
      teamId: DataTypes.STRING,
      teamDomain: DataTypes.STRING,
      accessToken: DataTypes.TEXT,
      botUserId: DataTypes.TEXT,
      botAccessToken: DataTypes.TEXT
    },
    {}
  );
  Team.associate = function(models) {
    // associations can be defined here
  };
  return Team;
};
