module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Payments', 'cashHandoverId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'CashHandovers', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Payments', ['tenantId', 'cashHandoverId'], {
      name: 'idx_payments_tenant_cash_handover',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Payments', 'idx_payments_tenant_cash_handover');
    await queryInterface.removeColumn('Payments', 'cashHandoverId');
  },
};
