module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define(
    'Team',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: DataTypes.TEXT,
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'Teams',
      timestamps: true,
      paranoid: true,
    }
  );

  Team.associate = (models) => {
    Team.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Team.belongsTo(models.Branch, { foreignKey: 'branchId' });
    Team.belongsToMany(models.Employee, {
      through: models.TeamMember,
      as: 'members',
      foreignKey: 'teamId',
      otherKey: 'employeeId',
    });
  };

  return Team;
};
