'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Users',
      'dwRefreshToken',
     Sequelize.STRING
    );
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeColumn(
      'Users',
      'dwRefreshToken',
     Sequelize.STRING
    );
  }
};
