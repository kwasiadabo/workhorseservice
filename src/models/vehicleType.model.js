module.exports = (sequelize, DataTypes) => {
  const VehicleType = sequelize.define(
    'VehicleType',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'VehicleTypes', timestamps: true, paranoid: true }
  );

  VehicleType.associate = (models) => {
    VehicleType.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    VehicleType.hasMany(models.Booking, { foreignKey: 'vehicleTypeId' });
  };

  return VehicleType;
};
