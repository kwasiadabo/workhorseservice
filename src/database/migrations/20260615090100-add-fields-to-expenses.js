module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Expenses', 'branchId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Branches', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await queryInterface.addColumn('Expenses', 'categoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'ExpenseCategories', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await queryInterface.addColumn('Expenses', 'description', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('Expenses', 'amount', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('Expenses', 'currency', { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'GH¢' });
    await queryInterface.addColumn('Expenses', 'expenseDate', { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CAST(GETDATE() AS DATE)') });
    await queryInterface.addColumn('Expenses', 'recordedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'NO ACTION',
    });

    await queryInterface.addIndex('Expenses', ['tenantId', 'branchId', 'expenseDate'], { name: 'idx_expenses_tenant_branch_date' });
    await queryInterface.addIndex('Expenses', ['tenantId', 'categoryId'], { name: 'idx_expenses_tenant_category' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Expenses', 'idx_expenses_tenant_category');
    await queryInterface.removeIndex('Expenses', 'idx_expenses_tenant_branch_date');
    await queryInterface.removeColumn('Expenses', 'recordedBy');
    await queryInterface.removeColumn('Expenses', 'expenseDate');
    await queryInterface.removeColumn('Expenses', 'currency');
    await queryInterface.removeColumn('Expenses', 'amount');
    await queryInterface.removeColumn('Expenses', 'description');
    await queryInterface.removeColumn('Expenses', 'categoryId');
    await queryInterface.removeColumn('Expenses', 'branchId');
  },
};
