module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BookingServices', {
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
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Services', key: 'id' },
        onDelete: 'NO ACTION',
      },
      priceAtBooking: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      durationAtBooking: { type: Sequelize.INTEGER, allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('BookingServices', ['bookingId'], { name: 'idx_booking_services_booking' });
    await queryInterface.addIndex('BookingServices', ['serviceId'], { name: 'idx_booking_services_service' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('BookingServices');
  },
};
