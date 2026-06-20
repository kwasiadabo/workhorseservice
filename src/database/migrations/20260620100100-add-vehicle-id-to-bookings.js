module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bookings', 'vehicleId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Vehicles', key: 'id' },
      onDelete: 'NO ACTION',
    });

    await queryInterface.addIndex('Bookings', ['tenantId', 'vehicleId'], {
      name: 'idx_bookings_tenant_vehicle',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Bookings', 'idx_bookings_tenant_vehicle');
    await queryInterface.removeColumn('Bookings', 'vehicleId');
  },
};
