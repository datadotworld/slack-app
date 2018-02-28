'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    slackid: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    responseurl: {
      type: DataTypes.STRING,
    },
    teamid: {
      type: DataTypes.STRING,
    },
    teamdomain: {
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
    dwtoken: {
      type: DataTypes.STRING,
    },
  }, {});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
