module.exports = (sequelize, DataTypes) => {
  const CashHandover = sequelize.define(
    'CashHandover',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: false },
      employeeId: { type: DataTypes.UUID, allowNull: false },
      periodStart: { type: DataTypes.DATE, allowNull: false },
      periodEnd: { type: DataTypes.DATE, allowNull: false },
      expectedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      declaredAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      variance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      status: {
        type: DataTypes.ENUM('submitted', 'reconciled', 'disputed'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      notes: DataTypes.TEXT,
      reviewNotes: DataTypes.TEXT,
      submittedBy: { type: DataTypes.UUID, allowNull: false },
      submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      reconciledBy: { type: DataTypes.UUID, allowNull: true },
      reconciledAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'CashHandovers',
      timestamps: true,
    }
  );

  CashHandover.associate = (models) => {
    CashHandover.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    CashHandover.belongsTo(models.Branch, { foreignKey: 'branchId' });
    CashHandover.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    CashHandover.belongsTo(models.User, { foreignKey: 'submittedBy', as: 'submitter' });
    CashHandover.belongsTo(models.User, { foreignKey: 'reconciledBy', as: 'reconciler' });
    CashHandover.hasMany(models.Payment, { foreignKey: 'cashHandoverId' });
  };

  return CashHandover;
};
