module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ServiceCategories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: Sequelize.TEXT,
      displayOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('ServiceCategories', ['tenantId'], { name: 'idx_service_categories_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ServiceCategories');
  },
};
