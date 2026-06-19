module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    'Employee',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      branchId: { type: DataTypes.UUID, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: true },
      firstName: { type: DataTypes.STRING(100), allowNull: false },
      middleName: DataTypes.STRING(100),
      lastName: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      phone: DataTypes.STRING(30),
      positionId: { type: DataTypes.UUID, allowNull: true },
      hireDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'on_leave'),
        allowNull: false,
        defaultValue: 'active',
      },
      avatarUrl: DataTypes.STRING(500),
      commissionRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    },
    {
      tableName: 'Employees',
      timestamps: true,
      paranoid: true,
    }
  );

  Employee.associate = (models) => {
    Employee.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Employee.belongsTo(models.Branch, { foreignKey: 'branchId' });
    Employee.belongsTo(models.User, { foreignKey: 'userId' });
    Employee.belongsTo(models.Position, { foreignKey: 'positionId' });
    Employee.hasMany(models.BookingAssignment, { foreignKey: 'employeeId' });
  };

  return Employee;
};
