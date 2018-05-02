'use strict';
module.exports = (sequelize, DataTypes) => {
  var Subscription = sequelize.define('Subscription', {
    channelId: DataTypes.STRING,
    slackUserId: DataTypes.STRING,
    resourceId: DataTypes.STRING
  }, {});
  Subscription.associate = function(models) {
    // associations can be defined here
  };
  return Subscription;
};