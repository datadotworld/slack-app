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
      slackid: {
        allowNull: false,
        type: Sequelize.STRING
      },
      responseurl: {
        type: Sequelize.STRING,
      },
      teamid: {
        type: Sequelize.STRING,
      },
      teamdomain: {
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
      dwtoken: {
        type: Sequelize.STRING
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
