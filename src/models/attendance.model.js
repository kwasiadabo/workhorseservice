// Phase 2 stub — see migration 20260611102000-create-attendance.js for the planned full schema.
module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define(
    'Attendance',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: 'Attendance',
      timestamps: true,
    }
  );

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
  };

  return Attendance;
};
