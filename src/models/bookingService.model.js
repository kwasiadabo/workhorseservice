module.exports = (sequelize, DataTypes) => {
  const BookingService = sequelize.define(
    'BookingService',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: false },
      serviceId: { type: DataTypes.UUID, allowNull: false },
      priceAtBooking: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      durationAtBooking: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      tableName: 'BookingServices',
      timestamps: true,
    }
  );

  BookingService.associate = (models) => {
    BookingService.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    BookingService.belongsTo(models.Booking, { foreignKey: 'bookingId' });
    BookingService.belongsTo(models.Service, { foreignKey: 'serviceId' });
    BookingService.hasMany(models.BookingAssignment, { foreignKey: 'bookingServiceId' });
  };

  return BookingService;
};
