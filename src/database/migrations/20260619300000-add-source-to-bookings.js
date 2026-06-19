'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'source'`
    );
    if (!rows.length) {
      await queryInterface.addColumn('Bookings', 'source', {
        type: Sequelize.ENUM('staff', 'portal'),
        allowNull: false,
        defaultValue: 'staff',
      });
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('Bookings', 'source');
    } catch (_) {
      // already removed
    }
  },
};
