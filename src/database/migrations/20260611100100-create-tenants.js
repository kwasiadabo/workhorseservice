module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tenants', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      businessType: {
        type: Sequelize.ENUM(
          'barbershop',
          'salon',
          'spa',
          'car_wash',
          'nail_studio',
          'cleaning',
          'massage',
          'other'
        ),
        allowNull: false,
      },
      email: { type: Sequelize.STRING(150), allowNull: false },
      phone: Sequelize.STRING(30),
      address: Sequelize.STRING(255),
      logoUrl: Sequelize.STRING(500),
      status: {
        type: Sequelize.ENUM('trial', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'trial',
      },
      planId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Plans', key: 'id' },
        onDelete: 'SET NULL',
      },
      trialEndsAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Tenants');
  },
};
