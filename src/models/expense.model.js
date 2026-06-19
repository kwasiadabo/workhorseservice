module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    'Expense',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: true },
      categoryId: { type: DataTypes.UUID, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
      recordedBy: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'Expenses',
      timestamps: true,
    }
  );

  Expense.associate = (models) => {
    Expense.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Expense.belongsTo(models.Branch, { foreignKey: 'branchId' });
    Expense.belongsTo(models.ExpenseCategory, { foreignKey: 'categoryId' });
    Expense.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
  };

  return Expense;
};
