module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      description: DataTypes.STRING(255),
      priceMonthly: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      priceYearly: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      maxBranches: { type: DataTypes.INTEGER, allowNull: true },
      maxEmployees: { type: DataTypes.INTEGER, allowNull: true },
      maxBookingsPerMonth: { type: DataTypes.INTEGER, allowNull: true },
      smsMonthlyLimit: { type: DataTypes.INTEGER, allowNull: true },
      features: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'Plans',
      timestamps: true,
    }
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Tenant, { foreignKey: 'planId' });
  };

  return Plan;
};
