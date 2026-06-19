module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      firstName: { type: DataTypes.STRING(100), allowNull: false },
      lastName: { type: DataTypes.STRING(100), allowNull: false },
      phone: DataTypes.STRING(30),
      avatarUrl: DataTypes.STRING(500),
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      passwordResetTokenHash: { type: DataTypes.STRING(255), allowNull: true },
      passwordResetExpiresAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'Users',
      timestamps: true,
      paranoid: true,
      defaultScope: {
        attributes: { exclude: ['passwordHash', 'passwordResetTokenHash', 'passwordResetExpiresAt'] },
      },
      scopes: {
        withPassword: {
          attributes: {},
        },
      },
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    User.belongsToMany(models.Role, { through: models.UserRole, foreignKey: 'userId', otherKey: 'roleId' });
    User.hasMany(models.RefreshToken, { foreignKey: 'userId' });
    User.hasOne(models.Employee, { foreignKey: 'userId' });
  };

  return User;
};
