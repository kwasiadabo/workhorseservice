module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Services', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'ServiceCategories', key: 'id' },
        onDelete: 'NO ACTION',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: Sequelize.TEXT,
      durationMinutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Services', ['tenantId', 'categoryId', 'isActive'], {
      name: 'idx_services_tenant_category_active',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Services');
  },
};
