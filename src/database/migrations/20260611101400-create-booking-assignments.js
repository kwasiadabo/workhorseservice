module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BookingAssignments', {
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
      bookingServiceId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'BookingServices', key: 'id' },
        onDelete: 'NO ACTION',
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Employees', key: 'id' },
        onDelete: 'NO ACTION',
      },
      status: {
        type: Sequelize.ENUM('assigned', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assignedAt: { type: Sequelize.DATE, allowNull: false },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('BookingAssignments', ['bookingId'], { name: 'idx_booking_assignments_booking' });
    await queryInterface.addIndex('BookingAssignments', ['employeeId', 'status'], {
      name: 'idx_booking_assignments_employee_status',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('BookingAssignments');
  },
};
