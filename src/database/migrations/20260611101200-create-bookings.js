module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Bookings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Branches', key: 'id' },
        onDelete: 'CASCADE',
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Customers', key: 'id' },
        onDelete: 'NO ACTION',
      },
      bookingNumber: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'pending',
      },
      scheduledAt: { type: Sequelize.DATE, allowNull: false },
      totalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      notes: Sequelize.TEXT,
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Bookings', ['tenantId', 'branchId', 'scheduledAt'], {
      name: 'idx_bookings_tenant_branch_scheduled',
    });
    await queryInterface.addIndex('Bookings', ['tenantId', 'status'], { name: 'idx_bookings_tenant_status' });
    await queryInterface.addIndex('Bookings', ['tenantId', 'customerId'], { name: 'idx_bookings_tenant_customer' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Bookings');
  },
};
