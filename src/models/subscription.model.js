module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      planId: { type: DataTypes.UUID, allowNull: true },
      status: {
        type: DataTypes.ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'trialing',
      },
      currentPeriodStart: { type: DataTypes.DATE, allowNull: false },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: false },
      trialStartedAt: { type: DataTypes.DATE, allowNull: true },
      trialSkipped: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      cancelAtPeriodEnd: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      billingCycle: {
        type: DataTypes.ENUM('monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly',
      },
      paystackReference: { type: DataTypes.STRING(100), allowNull: true },
      paystackAuthorizationCode: { type: DataTypes.STRING(100), allowNull: true },
      lastPaymentReference: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'Subscriptions',
      timestamps: true,
    }
  );

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Subscription.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
  };

  return Subscription;
};
