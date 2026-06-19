module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Deposit percentage tenants can require from self-booking customers (0 = no deposit)
    await queryInterface.addColumn('Tenants', 'portalDepositPercent', {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
    });

    // Store the Paystack reference and amount of the deposit paid at self-booking time
    await queryInterface.addColumn('Bookings', 'depositReference', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('Bookings', 'depositAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Bookings', 'depositAmount');
    await queryInterface.removeColumn('Bookings', 'depositReference');
    await queryInterface.removeColumn('Tenants', 'portalDepositPercent');
  },
};
