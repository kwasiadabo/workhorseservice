module.exports = (sequelize, DataTypes) => {
  const TeamMember = sequelize.define(
    'TeamMember',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      teamId: { type: DataTypes.UUID, allowNull: false },
      employeeId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: 'TeamMembers',
      timestamps: true,
    }
  );

  TeamMember.associate = (models) => {
    TeamMember.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    TeamMember.belongsTo(models.Team, { foreignKey: 'teamId' });
    TeamMember.belongsTo(models.Employee, { foreignKey: 'employeeId' });
  };

  return TeamMember;
};
