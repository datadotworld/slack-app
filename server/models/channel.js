'use strict';
module.exports = (sequelize, DataTypes) => {
  var Channel = sequelize.define('Channel', {
    channelId: DataTypes.STRING,
    slackUserId: DataTypes.STRING,
    teamId: DataTypes.STRING
  }, {});
  Channel.associate = function(models) {
    // associations can be defined here
  };
  return Channel;
};