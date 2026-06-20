module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Vehicles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Customers', key: 'id' },
        onDelete: 'NO ACTION',
      },
      vehicleTypeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'VehicleTypes', key: 'id' },
        onDelete: 'NO ACTION',
      },
      registration: { type: Sequelize.STRING(50), allowNull: false },
      make: { type: Sequelize.STRING(100), allowNull: true },
      model: { type: Sequelize.STRING(100), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Vehicles', ['tenantId', 'customerId'], { name: 'idx_vehicles_tenant_customer' });
    await queryInterface.addIndex('Vehicles', ['tenantId', 'registration'], {
      name: 'uq_vehicles_tenant_registration',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Vehicles');
  },
};
