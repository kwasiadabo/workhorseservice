module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ServiceVehiclePrices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
      },
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Services', key: 'id' },
      },
      vehicleTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'VehicleTypes', key: 'id' },
      },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ServiceVehiclePrices', ['tenantId'], {
      name: 'idx_service_vehicle_prices_tenant',
    });
    await queryInterface.addIndex('ServiceVehiclePrices', ['serviceId', 'vehicleTypeId'], {
      name: 'idx_service_vehicle_prices_service_vehicle',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ServiceVehiclePrices');
  },
};
