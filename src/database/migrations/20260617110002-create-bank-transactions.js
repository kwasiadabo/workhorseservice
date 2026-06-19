'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BankTransactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('NEWID()'),
        primaryKey: true,
        allowNull: false,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      bankAccountId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'BankAccounts', key: 'id' },
        onDelete: 'NO ACTION',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Branches', key: 'id' },
        onDelete: 'NO ACTION',
      },
      type: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      referenceNumber: { type: Sequelize.STRING(100), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      transactionDate: { type: Sequelize.DATEONLY, allowNull: false },
      recordedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') },
    });

    await queryInterface.addIndex('BankTransactions', ['tenantId'], { name: 'idx_banktx_tenantId' });
    await queryInterface.addIndex('BankTransactions', ['tenantId', 'bankAccountId'], { name: 'idx_banktx_tenant_account' });
    await queryInterface.addIndex('BankTransactions', ['tenantId', 'transactionDate'], { name: 'idx_banktx_tenant_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BankTransactions');
  },
};
