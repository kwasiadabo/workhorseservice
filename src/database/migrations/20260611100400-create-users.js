module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING(255), allowNull: false },
      firstName: { type: Sequelize.STRING(100), allowNull: false },
      lastName: { type: Sequelize.STRING(100), allowNull: false },
      phone: Sequelize.STRING(30),
      avatarUrl: Sequelize.STRING(500),
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      lastLoginAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Users', ['tenantId'], { name: 'idx_users_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Users');
  },
};
