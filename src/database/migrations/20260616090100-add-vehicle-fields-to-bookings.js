module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bookings', 'vehicleTypeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'VehicleTypes', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await queryInterface.addColumn('Bookings', 'vehicleRegistration', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('Bookings', 'vehicleMake', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('Bookings', 'vehicleModel', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addIndex('Bookings', ['tenantId', 'vehicleTypeId'], {
      name: 'idx_bookings_tenant_vehicle_type',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Bookings', 'idx_bookings_tenant_vehicle_type');
    await queryInterface.removeColumn('Bookings', 'vehicleModel');
    await queryInterface.removeColumn('Bookings', 'vehicleMake');
    await queryInterface.removeColumn('Bookings', 'vehicleRegistration');
    await queryInterface.removeColumn('Bookings', 'vehicleTypeId');
  },
};
