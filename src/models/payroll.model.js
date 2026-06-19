// Phase 2 stub — see migration 20260611101700-create-payroll.js for the planned full schema.
module.exports = (sequelize, DataTypes) => {
  const Payroll = sequelize.define(
    'Payroll',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: 'Payroll',
      timestamps: true,
    }
  );

  Payroll.associate = (models) => {
    Payroll.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
  };

  return Payroll;
};
