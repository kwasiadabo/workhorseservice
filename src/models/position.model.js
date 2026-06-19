module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define(
    'Position',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'Positions',
      timestamps: true,
      paranoid: true,
    }
  );

  Position.associate = (models) => {
    Position.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Position.hasMany(models.Employee, { foreignKey: 'positionId' });
  };

  return Position;
};
