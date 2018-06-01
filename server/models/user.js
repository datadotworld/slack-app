'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    slackId: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    teamId: {
      type: DataTypes.STRING,
    },
    teamDomain: {
      type: DataTypes.STRING,
    },
    nonce: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    dwUserId: {
      type: DataTypes.TEXT
    },
    dwAccessToken: {
      type: DataTypes.TEXT
    },
    dwRefreshToken: {
      type: DataTypes.TEXT
    },
    dwTokenExpiresAt: {
      type: DataTypes.DATE
    },
  }, {});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
