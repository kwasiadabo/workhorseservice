'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SmsCampaigns', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      message: { type: Sequelize.TEXT, allowNull: false },
      audienceType: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'all' },
      recipientCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sentBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      sentAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('SmsCampaigns', ['tenantId', 'sentAt'], {
      name: 'idx_sms_campaigns_tenant_sentat',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SmsCampaigns');
  },
};
