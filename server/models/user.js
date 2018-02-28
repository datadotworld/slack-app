'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    slackid: {
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
      type: DataTypes.STRING,
      allowNull: false,
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
