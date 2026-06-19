// Adds service-delivery fields captured when a booking is marked
// "completed": actual start/completion timestamps (duration is derived
// from these and stored for reporting), customer behaviour notes,
// satisfaction rating (1-5), and any concerns raised by staff.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bookings', 'startedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('Bookings', 'completedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('Bookings', 'durationMinutes', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('Bookings', 'customerBehavior', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('Bookings', 'satisfactionRating', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('Bookings', 'employeeConcerns', { type: Sequelize.TEXT, allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Bookings', 'employeeConcerns');
    await queryInterface.removeColumn('Bookings', 'satisfactionRating');
    await queryInterface.removeColumn('Bookings', 'customerBehavior');
    await queryInterface.removeColumn('Bookings', 'durationMinutes');
    await queryInterface.removeColumn('Bookings', 'completedAt');
    await queryInterface.removeColumn('Bookings', 'startedAt');
  },
};
