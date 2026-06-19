module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define(
    'Service',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      categoryId: { type: DataTypes.UUID, allowNull: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: DataTypes.TEXT,
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'GH¢' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'Services',
      timestamps: true,
      paranoid: true,
    }
  );

  Service.associate = (models) => {
    Service.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Service.belongsTo(models.ServiceCategory, { foreignKey: 'categoryId' });
    Service.hasMany(models.BookingService, { foreignKey: 'serviceId' });
    Service.hasMany(models.ServiceVehiclePrice, { foreignKey: 'serviceId', as: 'vehiclePrices' });
  };

  return Service;
};
