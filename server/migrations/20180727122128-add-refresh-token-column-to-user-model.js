'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'User',
      'dwRefreshToken',
     Sequelize.STRING
    );
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      'User',
      'dwRefreshToken',
     Sequelize.STRING
    );
  }
};
