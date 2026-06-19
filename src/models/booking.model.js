module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define(
    'Booking',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: false },
      customerId: { type: DataTypes.UUID, allowNull: false },
      bookingNumber: { type: DataTypes.STRING(30), allowNull: false },
      status: {
        type: DataTypes.ENUM('confirmed', 'in_progress', 'awaiting_payment', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      scheduledAt: { type: DataTypes.DATE, allowNull: false },
      totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      notes: DataTypes.TEXT,
      createdBy: { type: DataTypes.UUID, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
      customerBehavior: DataTypes.TEXT,
      satisfactionRating: { type: DataTypes.INTEGER, allowNull: true },
      employeeConcerns: DataTypes.TEXT,
      vehicleTypeId: { type: DataTypes.UUID, allowNull: true },
      vehicleRegistration: { type: DataTypes.STRING(50), allowNull: true },
      vehicleMake: { type: DataTypes.STRING(100), allowNull: true },
      vehicleModel: { type: DataTypes.STRING(100), allowNull: true },
      depositReference: { type: DataTypes.STRING(100), allowNull: true },
      depositAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      source: { type: DataTypes.ENUM('staff', 'portal'), allowNull: false, defaultValue: 'staff' },
    },
    {
      tableName: 'Bookings',
      timestamps: true,
      paranoid: true,
      indexes: [{ unique: true, fields: ['tenantId', 'bookingNumber'], name: 'uq_bookings_tenant_booking_number' }],
    }
  );

  Booking.associate = (models) => {
    Booking.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Booking.belongsTo(models.Branch, { foreignKey: 'branchId' });
    Booking.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Booking.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Booking.hasMany(models.BookingService, { foreignKey: 'bookingId', as: 'bookingServices' });
    Booking.hasMany(models.BookingAssignment, { foreignKey: 'bookingId', as: 'assignments' });
    Booking.hasMany(models.Payment, { foreignKey: 'bookingId' });
    Booking.belongsTo(models.VehicleType, { foreignKey: 'vehicleTypeId' });
  };

  return Booking;
};
