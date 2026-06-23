module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('BookingAssignments', 'teamId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Teams', key: 'id' },
      onDelete: 'NO ACTION',
    });

    await queryInterface.addIndex('BookingAssignments', ['teamId'], {
      name: 'idx_booking_assignments_team',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('BookingAssignments', 'idx_booking_assignments_team');
    await queryInterface.removeColumn('BookingAssignments', 'teamId');
  },
};
