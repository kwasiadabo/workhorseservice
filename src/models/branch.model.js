module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    'Branch',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      address: DataTypes.STRING(255),
      city: DataTypes.STRING(100),
      phone: DataTypes.STRING(30),
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'Branches',
      timestamps: true,
      paranoid: true,
    }
  );

  Branch.associate = (models) => {
    Branch.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Branch.hasMany(models.Employee, { foreignKey: 'branchId' });
    Branch.hasMany(models.Booking, { foreignKey: 'branchId' });
  };

  return Branch;
};
