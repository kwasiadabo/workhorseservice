module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define(
    'Tenant',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: true } },
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { is: /^[a-z0-9-]+$/ },
      },
      businessType: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false, validate: { isEmail: true } },
      phone: DataTypes.STRING(30),
      address: DataTypes.STRING(255),
      logoUrl: DataTypes.STRING(500),
      status: {
        type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'trial',
      },
      planId: { type: DataTypes.UUID, allowNull: true },
      trialEndsAt: { type: DataTypes.DATE, allowNull: true },
      paystackCustomerCode: { type: DataTypes.STRING(100), allowNull: true },
      loyaltyThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      loyaltyRewardDescription: { type: DataTypes.STRING(500), allowNull: true },
      portalDepositPercent: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'Tenants',
      timestamps: true,
    }
  );

  Tenant.associate = (models) => {
    Tenant.belongsTo(models.Plan, { foreignKey: 'planId' });
    Tenant.hasOne(models.Subscription, { foreignKey: 'tenantId', as: 'subscription' });
    Tenant.hasMany(models.User, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.Branch, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.Employee, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.Customer, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.ServiceCategory, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.Service, { foreignKey: 'tenantId' });
    Tenant.hasMany(models.Booking, { foreignKey: 'tenantId' });
  };

  return Tenant;
};
