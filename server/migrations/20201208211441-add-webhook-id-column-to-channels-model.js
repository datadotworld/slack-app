"use strict";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      "Channels",
      "webhookId",
      Sequelize.STRING
    );
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      "Channels",
      "webhookId",
      Sequelize.STRING
    );
  }
};
