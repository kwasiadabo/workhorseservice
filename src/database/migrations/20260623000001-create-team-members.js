module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TeamMembers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'NO ACTION',
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Teams', key: 'id' },
        onDelete: 'NO ACTION',
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Employees', key: 'id' },
        onDelete: 'NO ACTION',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('TeamMembers', ['tenantId'], { name: 'idx_team_members_tenant' });
    await queryInterface.addIndex('TeamMembers', ['teamId', 'employeeId'], {
      name: 'idx_team_members_team_employee',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('TeamMembers');
  },
};
