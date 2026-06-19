// Phase 3 stub — see migration 20260611102300-create-audit-logs.js for the planned full schema.
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'AuditLogs',
      timestamps: true,
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
  };

  return AuditLog;
};
