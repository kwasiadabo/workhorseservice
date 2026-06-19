module.exports = (sequelize, DataTypes) => {
  const SmsCampaign = sequelize.define(
    'SmsCampaign',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      audienceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
      recipientCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sentBy: { type: DataTypes.UUID, allowNull: false },
      sentAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'SmsCampaigns',
      timestamps: true,
    }
  );

  SmsCampaign.associate = (models) => {
    SmsCampaign.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    SmsCampaign.belongsTo(models.User, { foreignKey: 'sentBy', as: 'sender' });
  };

  return SmsCampaign;
};
