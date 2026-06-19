module.exports = (sequelize, DataTypes) => {
  const Bank = sequelize.define(
    'Bank',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      shortCode: { type: DataTypes.STRING(20), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'Banks',
      timestamps: true,
      paranoid: true,
    }
  );

  Bank.associate = (models) => {
    Bank.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Bank.hasMany(models.BankAccount, { foreignKey: 'bankId' });
  };

  return Bank;
};
