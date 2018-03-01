'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      slackId: {
        allowNull: false,
        type: Sequelize.STRING
      },
      teamId: {
        type: Sequelize.STRING,
      },
      teamDomain: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.STRING
      },
      firstname: {
        type: Sequelize.STRING
      },
      lastname: {
        type: Sequelize.STRING
      },
      nonce: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      dwAccessToken: {
        type: Sequelize.STRING
      },
      dwRefreshToken: {
        type: Sequelize.STRING
      },
      dwTokenExpiresAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Users');
  }
};
