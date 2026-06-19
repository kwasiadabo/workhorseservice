module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Plans', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      description: Sequelize.STRING(255),
      priceMonthly: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      priceYearly: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      maxBranches: { type: Sequelize.INTEGER, allowNull: true },
      maxEmployees: { type: Sequelize.INTEGER, allowNull: true },
      maxBookingsPerMonth: { type: Sequelize.INTEGER, allowNull: true },
      features: { type: Sequelize.TEXT, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Plans');
  },
};
