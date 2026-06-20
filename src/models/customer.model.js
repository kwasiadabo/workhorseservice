module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    'Customer',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(200), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING(30), allowNull: false },
      notes: DataTypes.TEXT,
      loyaltyPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      smsOptOut: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'Customers',
      timestamps: true,
      paranoid: true,
    }
  );

  Customer.associate = (models) => {
    Customer.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Customer.hasMany(models.Booking, { foreignKey: 'customerId' });
    Customer.hasMany(models.Vehicle, { foreignKey: 'customerId' });
  };

  return Customer;
};
