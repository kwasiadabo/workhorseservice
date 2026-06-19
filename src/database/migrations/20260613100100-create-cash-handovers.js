module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CashHandovers', {
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
        onDelete: 'NO ACTION',
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Employees', key: 'id' },
        onDelete: 'NO ACTION',
      },
      periodStart: { type: Sequelize.DATE, allowNull: false },
      periodEnd: { type: Sequelize.DATE, allowNull: false },
      expectedAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      declaredAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      variance: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      status: {
        type: Sequelize.ENUM('submitted', 'reconciled', 'disputed'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      notes: Sequelize.TEXT,
      reviewNotes: Sequelize.TEXT,
      submittedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      submittedAt: { type: Sequelize.DATE, allowNull: false },
      reconciledBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'NO ACTION',
      },
      reconciledAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('CashHandovers', ['tenantId', 'employeeId'], {
      name: 'idx_cash_handovers_tenant_employee',
    });
    await queryInterface.addIndex('CashHandovers', ['tenantId', 'branchId', 'periodStart'], {
      name: 'idx_cash_handovers_tenant_branch_period',
    });
    await queryInterface.addIndex('CashHandovers', ['tenantId', 'status'], {
      name: 'idx_cash_handovers_tenant_status',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('CashHandovers');
  },
};
