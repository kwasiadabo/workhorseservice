module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    'Vehicle',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      customerId: { type: DataTypes.UUID, allowNull: false },
      vehicleTypeId: { type: DataTypes.UUID, allowNull: true },
      registration: { type: DataTypes.STRING(50), allowNull: false },
      make: { type: DataTypes.STRING(100), allowNull: true },
      model: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'Vehicles', timestamps: true, paranoid: true }
  );

  Vehicle.associate = (models) => {
    Vehicle.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Vehicle.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Vehicle.belongsTo(models.VehicleType, { foreignKey: 'vehicleTypeId' });
    Vehicle.hasMany(models.Booking, { foreignKey: 'vehicleId' });
  };

  return Vehicle;
};
