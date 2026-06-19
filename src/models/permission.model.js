module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      description: DataTypes.STRING(255),
    },
    {
      tableName: 'Permissions',
      timestamps: true,
    }
  );

  return Permission;
};
