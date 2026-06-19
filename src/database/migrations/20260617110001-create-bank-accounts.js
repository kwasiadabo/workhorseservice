'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BankAccounts', {
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
      bankId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Banks', key: 'id' },
        onDelete: 'NO ACTION',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Branches', key: 'id' },
        onDelete: 'NO ACTION',
      },
      accountName: { type: Sequelize.STRING(150), allowNull: false },
      accountNumber: { type: Sequelize.STRING(50), allowNull: false },
      accountType: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'current',
      },
      openingBalance: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'GHS' },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('GETDATE()') },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('BankAccounts', ['tenantId'], { name: 'idx_bankaccounts_tenantId' });
    await queryInterface.addIndex('BankAccounts', ['tenantId', 'bankId'], { name: 'idx_bankaccounts_tenant_bank' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BankAccounts');
  },
};
