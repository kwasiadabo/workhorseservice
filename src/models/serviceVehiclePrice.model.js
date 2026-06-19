module.exports = (sequelize, DataTypes) => {
  const ServiceVehiclePrice = sequelize.define(
    'ServiceVehiclePrice',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      serviceId: { type: DataTypes.UUID, allowNull: false },
      vehicleTypeId: { type: DataTypes.UUID, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'ServiceVehiclePrices', timestamps: true }
  );

  ServiceVehiclePrice.associate = (models) => {
    ServiceVehiclePrice.belongsTo(models.Service, { foreignKey: 'serviceId' });
    ServiceVehiclePrice.belongsTo(models.VehicleType, { foreignKey: 'vehicleTypeId' });
    ServiceVehiclePrice.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
  };

  return ServiceVehiclePrice;
};
