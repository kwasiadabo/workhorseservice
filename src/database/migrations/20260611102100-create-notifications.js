/**
 * Phase 2 stub — Notifications
 *
 * Future schema (not yet enforced):
 *   userId            UUID          FK -> Users.id (ON DELETE CASCADE)
 *   type              ENUM('email','sms','in_app')  NOT NULL
 *   title             STRING(200)   NOT NULL
 *   body              TEXT
 *   isRead            BOOLEAN       NOT NULL DEFAULT false
 *   sentAt            DATE          NULL
 *   metadata          JSON / TEXT   NULL
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Notifications', {
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

    await queryInterface.addIndex('Notifications', ['tenantId'], { name: 'idx_notifications_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Notifications');
  },
};
