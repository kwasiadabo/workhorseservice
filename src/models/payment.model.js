module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      method: {
        type: DataTypes.ENUM('cash', 'card', 'mobile_money', 'bank_transfer', 'other'),
        allowNull: false,
        defaultValue: 'cash',
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'completed',
      },
      referenceNumber: { type: DataTypes.STRING(100), allowNull: true },
      receivedBy: { type: DataTypes.UUID, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      notes: DataTypes.TEXT,
      cashHandoverId: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'Payments',
      timestamps: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Payment.belongsTo(models.Booking, { foreignKey: 'bookingId' });
    Payment.belongsTo(models.User, { foreignKey: 'receivedBy', as: 'receiver' });
    Payment.belongsTo(models.CashHandover, { foreignKey: 'cashHandoverId' });
  };

  return Payment;
};
