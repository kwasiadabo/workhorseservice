module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Employees', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      firstName: { type: Sequelize.STRING(100), allowNull: false },
      lastName: { type: Sequelize.STRING(100), allowNull: false },
      email: Sequelize.STRING(150),
      phone: Sequelize.STRING(30),
      position: Sequelize.STRING(100),
      hireDate: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'on_leave'),
        allowNull: false,
        defaultValue: 'active',
      },
      avatarUrl: Sequelize.STRING(500),
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Employees', ['tenantId', 'branchId', 'status'], {
      name: 'idx_employees_tenant_branch_status',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Employees');
  },
};
