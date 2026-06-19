/**
 * Phase 2 stub — Ratings
 *
 * Future schema (not yet enforced):
 *   bookingId         UUID          FK -> Bookings.id (ON DELETE CASCADE)
 *   employeeId        UUID          FK -> Employees.id (nullable, ON DELETE SET NULL)
 *   customerId        UUID          FK -> Customers.id (ON DELETE CASCADE)
 *   score             INTEGER       NOT NULL  - 1..5
 *   comment           TEXT
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Ratings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Ratings', ['tenantId'], { name: 'idx_ratings_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Ratings');
  },
};
