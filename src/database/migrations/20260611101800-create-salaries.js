/**
 * Phase 2 stub — Salaries
 *
 * Future schema (not yet enforced):
 *   employeeId        UUID          FK -> Employees.id (ON DELETE CASCADE)
 *   baseAmount        DECIMAL(10,2) NOT NULL
 *   currency          STRING(3)     NOT NULL DEFAULT 'USD'
 *   payFrequency      ENUM('hourly','daily','weekly','monthly')  NOT NULL DEFAULT 'monthly'
 *   effectiveFrom     DATEONLY      NOT NULL
 *   effectiveTo       DATEONLY      NULL
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Salaries', {
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

    await queryInterface.addIndex('Salaries', ['tenantId'], { name: 'idx_salaries_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Salaries');
  },
};
