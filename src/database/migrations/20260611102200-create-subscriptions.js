/**
 * Phase 2 stub — Subscriptions
 *
 * Future schema (not yet enforced):
 *   planId                  UUID          FK -> Plans.id
 *   status                  ENUM('trialing','active','past_due','cancelled')  NOT NULL DEFAULT 'trialing'
 *   currentPeriodStart      DATE          NOT NULL
 *   currentPeriodEnd        DATE          NOT NULL
 *   cancelAtPeriodEnd       BOOLEAN       NOT NULL DEFAULT false
 *   externalSubscriptionId  STRING(255)   NULL  - payment-provider subscription id
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Subscriptions', {
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

    await queryInterface.addIndex('Subscriptions', ['tenantId'], { name: 'idx_subscriptions_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Subscriptions');
  },
};
