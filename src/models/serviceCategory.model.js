module.exports = (sequelize, DataTypes) => {
  const ServiceCategory = sequelize.define(
    'ServiceCategory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: DataTypes.TEXT,
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'ServiceCategories',
      timestamps: true,
      paranoid: true,
    }
  );

  ServiceCategory.associate = (models) => {
    ServiceCategory.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    ServiceCategory.hasMany(models.Service, { foreignKey: 'categoryId' });
  };

  return ServiceCategory;
};
