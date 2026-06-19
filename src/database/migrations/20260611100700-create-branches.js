module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Branches', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      address: Sequelize.STRING(255),
      city: Sequelize.STRING(100),
      phone: Sequelize.STRING(30),
      email: Sequelize.STRING(150),
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Branches', ['tenantId'], { name: 'idx_branches_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Branches');
  },
};
