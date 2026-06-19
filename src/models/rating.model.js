module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    'Rating',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: true },
      customerId: { type: DataTypes.UUID, allowNull: true },
      employeeId: { type: DataTypes.UUID, allowNull: true },
      stars: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT, allowNull: true },
      token: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      tokenUsedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'Ratings',
      timestamps: true,
    }
  );

  Rating.associate = (models) => {
    Rating.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Rating.belongsTo(models.Booking, { foreignKey: 'bookingId' });
    Rating.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Rating.belongsTo(models.Employee, { foreignKey: 'employeeId' });
  };

  return Rating;
};
