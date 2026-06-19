module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Customers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      firstName: { type: Sequelize.STRING(100), allowNull: false },
      lastName: Sequelize.STRING(100),
      email: Sequelize.STRING(150),
      phone: Sequelize.STRING(30),
      dateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.ENUM('male', 'female', 'other', 'unspecified'), allowNull: true },
      notes: Sequelize.TEXT,
      loyaltyPoints: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('Customers', ['tenantId', 'phone'], { name: 'idx_customers_tenant_phone' });
    await queryInterface.addIndex('Customers', ['tenantId', 'email'], { name: 'idx_customers_tenant_email' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Customers');
  },
};
