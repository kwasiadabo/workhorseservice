/**
 * Phase 2 stub — Expenses
 *
 * Future schema (not yet enforced):
 *   category          STRING(100)   NOT NULL   - e.g. rent, supplies, utilities
 *   description       TEXT
 *   amount            DECIMAL(10,2) NOT NULL
 *   currency          STRING(3)     NOT NULL DEFAULT 'USD'
 *   expenseDate       DATEONLY      NOT NULL
 *   branchId          UUID          FK -> Branches.id (nullable, ON DELETE SET NULL)
 *   recordedBy        UUID          FK -> Users.id (nullable, ON DELETE SET NULL)
 *   receiptUrl        STRING(500)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Expenses', {
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

    await queryInterface.addIndex('Expenses', ['tenantId'], { name: 'idx_expenses_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Expenses');
  },
};
