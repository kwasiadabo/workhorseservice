'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Employees', 'commissionRate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Percentage of completed service revenue paid to the employee (0–100)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Employees', 'commissionRate');
  },
};
