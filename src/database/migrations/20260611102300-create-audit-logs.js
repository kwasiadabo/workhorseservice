/**
 * Phase 3 stub — AuditLogs
 *
 * Future schema (not yet enforced):
 *   tenantId          UUID          FK -> Tenants.id (nullable, ON DELETE SET NULL)  - null for platform-level actions
 *   userId            UUID          FK -> Users.id (nullable, ON DELETE SET NULL)
 *   action            STRING(100)   NOT NULL  - e.g. 'booking.create', 'employee.delete'
 *   entityType        STRING(100)   NOT NULL
 *   entityId          UUID          NULL
 *   metadata          JSON / TEXT   NULL  - before/after diff, request context
 *   ipAddress         STRING(45)    NULL
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuditLogs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('AuditLogs', ['tenantId'], { name: 'idx_audit_logs_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('AuditLogs');
  },
};
