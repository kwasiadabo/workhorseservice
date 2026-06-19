module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: true },
      customerId: { type: DataTypes.UUID, allowNull: true },
      channel: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'sms' },
      type: { type: DataTypes.STRING(50), allowNull: false },
      to: { type: DataTypes.STRING(30), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
      scheduledFor: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      messageId: { type: DataTypes.STRING(100), allowNull: true },
      error: { type: DataTypes.STRING(500), allowNull: true },
      retryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'Notifications',
      timestamps: true,
    }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Notification.belongsTo(models.Booking, { foreignKey: 'bookingId' });
    Notification.belongsTo(models.Customer, { foreignKey: 'customerId' });
  };

  return Notification;
};
