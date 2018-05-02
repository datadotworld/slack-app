'use strict';
module.exports = (sequelize, DataTypes) => {
  var Team = sequelize.define('Team', {
    teamId: DataTypes.STRING,
    teamDomain: DataTypes.STRING,
    verificationToken: DataTypes.TEXT,
    accessToken: DataTypes.TEXT
  }, {});
  Team.associate = function(models) {
    // associations can be defined here
  };
  return Team;
};