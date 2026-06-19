// Phase 2 stub — see migration 20260611101800-create-salaries.js for the planned full schema.
module.exports = (sequelize, DataTypes) => {
  const Salary = sequelize.define(
    'Salary',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: 'Salaries',
      timestamps: true,
    }
  );

  Salary.associate = (models) => {
    Salary.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
  };

  return Salary;
};
