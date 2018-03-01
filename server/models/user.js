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
    email: {
      type: DataTypes.STRING,
      isEmail: true,
    },
    firstname: {
      type: DataTypes.STRING,
    },
    lastname: {
      type: DataTypes.STRING,
    },
    nonce: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    dwAccessToken: {
      type: DataTypes.STRING
    },
    dwRefreshToken: {
      type: DataTypes.STRING
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
