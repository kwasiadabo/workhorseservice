module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: DataTypes.STRING(255),
    },
    {
      tableName: 'Roles',
      timestamps: true,
    }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.User, { through: models.UserRole, foreignKey: 'roleId', otherKey: 'userId' });
  };

  return Role;
};
