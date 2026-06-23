module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Teams', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Branches', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: Sequelize.TEXT,
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Teams', ['tenantId'], { name: 'idx_teams_tenant' });
    await queryInterface.addIndex('Teams', ['tenantId', 'branchId'], { name: 'idx_teams_tenant_branch' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Teams');
  },
};
