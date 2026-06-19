/**
 * Phase 2 stub — Payroll
 *
 * Future schema (not yet enforced):
 *   employeeId        UUID          FK -> Employees.id (ON DELETE CASCADE)
 *   periodStart       DATEONLY      NOT NULL
 *   periodEnd         DATEONLY      NOT NULL
 *   grossAmount       DECIMAL(10,2) NOT NULL
 *   deductions        DECIMAL(10,2) NOT NULL DEFAULT 0
 *   netAmount         DECIMAL(10,2) NOT NULL
 *   status            ENUM('draft','approved','paid')   NOT NULL DEFAULT 'draft'
 *   paidAt            DATE          NULL
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Payroll', {
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

    await queryInterface.addIndex('Payroll', ['tenantId'], { name: 'idx_payroll_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Payroll');
  },
};
