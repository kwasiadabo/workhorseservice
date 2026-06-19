module.exports = (sequelize, DataTypes) => {
  const ExpenseCategory = sequelize.define(
    'ExpenseCategory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'ExpenseCategories',
      timestamps: true,
      paranoid: true,
    }
  );

  ExpenseCategory.associate = (models) => {
    ExpenseCategory.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    ExpenseCategory.hasMany(models.Expense, { foreignKey: 'categoryId' });
  };

  return ExpenseCategory;
};
