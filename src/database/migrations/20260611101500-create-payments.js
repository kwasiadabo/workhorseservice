module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Payments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      bookingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      method: {
        type: Sequelize.ENUM('cash', 'card', 'mobile_money', 'bank_transfer', 'other'),
        allowNull: false,
        defaultValue: 'cash',
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'completed',
      },
      referenceNumber: Sequelize.STRING(100),
      receivedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      paidAt: { type: Sequelize.DATE, allowNull: false },
      notes: Sequelize.TEXT,
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Payments', ['tenantId', 'bookingId'], { name: 'idx_payments_tenant_booking' });
    await queryInterface.addIndex('Payments', ['tenantId', 'paidAt'], { name: 'idx_payments_tenant_paidat' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Payments');
  },
};
