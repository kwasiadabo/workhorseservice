module.exports = (sequelize, DataTypes) => {
  const BankTransaction = sequelize.define(
    'BankTransaction',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bankAccountId: { type: DataTypes.UUID, allowNull: false },
      branch: { type: DataTypes.STRING(150), allowNull: true },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [['deposit', 'withdrawal']] },
      },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      referenceNumber: { type: DataTypes.STRING(100), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      transactionDate: { type: DataTypes.DATEONLY, allowNull: false },
      recordedBy: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'BankTransactions',
      timestamps: true,
    }
  );

  BankTransaction.associate = (models) => {
    BankTransaction.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    BankTransaction.belongsTo(models.BankAccount, { foreignKey: 'bankAccountId' });
    BankTransaction.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
  };

  return BankTransaction;
};
