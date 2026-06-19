module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserRoles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      roleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Roles', key: 'id' },
        onDelete: 'CASCADE',
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('UserRoles', ['userId', 'roleId'], {
      name: 'idx_user_roles_unique',
      unique: true,
    });
    await queryInterface.addIndex('UserRoles', ['tenantId'], { name: 'idx_user_roles_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('UserRoles');
  },
};
