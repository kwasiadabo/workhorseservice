// Adds `isTeamLead` to BookingAssignments — exactly one assignment per
// booking can be the team lead, enforced with a filtered unique index
// (supported on MSSQL via a partial/filtered index).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('BookingAssignments', 'isTeamLead', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE NONCLUSTERED INDEX idx_booking_assignments_team_lead
      ON [BookingAssignments] ([bookingId])
      WHERE [isTeamLead] = 1
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX idx_booking_assignments_team_lead ON [BookingAssignments]');
    await queryInterface.removeColumn('BookingAssignments', 'isTeamLead');
  },
};
