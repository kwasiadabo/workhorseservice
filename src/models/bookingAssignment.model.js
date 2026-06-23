module.exports = (sequelize, DataTypes) => {
  const BookingAssignment = sequelize.define(
    'BookingAssignment',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: false },
      bookingServiceId: { type: DataTypes.UUID, allowNull: true },
      employeeId: { type: DataTypes.UUID, allowNull: false },
      teamId: { type: DataTypes.UUID, allowNull: true },
      status: {
        type: DataTypes.ENUM('waiting', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'waiting',
      },
      assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      isTeamLead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'BookingAssignments',
      timestamps: true,
    }
  );

  BookingAssignment.associate = (models) => {
    BookingAssignment.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    BookingAssignment.belongsTo(models.Booking, { foreignKey: 'bookingId' });
    BookingAssignment.belongsTo(models.BookingService, { foreignKey: 'bookingServiceId' });
    BookingAssignment.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    BookingAssignment.belongsTo(models.Team, { foreignKey: 'teamId' });
  };

  return BookingAssignment;
};
