'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('BankTransactions', 'branchId');
    await queryInterface.addColumn('BankTransactions', 'branch', {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: 'bankAccountId',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('BankTransactions', 'branch');
    await queryInterface.addColumn('BankTransactions', 'branchId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Branches', key: 'id' },
      onDelete: 'NO ACTION',
    });
  },
};
