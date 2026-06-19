module.exports = (sequelize, DataTypes) => {
  const BankAccount = sequelize.define(
    'BankAccount',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bankId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: true },
      accountName: { type: DataTypes.STRING(150), allowNull: false },
      accountNumber: { type: DataTypes.STRING(50), allowNull: false },
      accountType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'current',
        validate: { isIn: [['savings', 'current']] },
      },
      openingBalance: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GHS' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'BankAccounts',
      timestamps: true,
      paranoid: true,
    }
  );

  BankAccount.associate = (models) => {
    BankAccount.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    BankAccount.belongsTo(models.Bank, { foreignKey: 'bankId' });
    BankAccount.belongsTo(models.Branch, { foreignKey: 'branchId' });
    BankAccount.hasMany(models.BankTransaction, { foreignKey: 'bankAccountId' });
  };

  return BankAccount;
};
