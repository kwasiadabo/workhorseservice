module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addIfMissing = async (table, column, def) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
      );
      if (!rows.length) await queryInterface.addColumn(table, column, def);
    };

    await addIfMissing('Subscriptions', 'paystackReference', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('Subscriptions', 'paystackAuthorizationCode', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('Subscriptions', 'billingCycle', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'monthly',
    });
    await addIfMissing('Subscriptions', 'lastPaymentReference', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('Tenants', 'paystackCustomerCode', { type: Sequelize.STRING(100), allowNull: true });
  },

  down: async (queryInterface) => {
    const drops = [
      ['Tenants', 'paystackCustomerCode'],
      ['Subscriptions', 'lastPaymentReference'],
      ['Subscriptions', 'billingCycle'],
      ['Subscriptions', 'paystackAuthorizationCode'],
      ['Subscriptions', 'paystackReference'],
    ];
    for (const [table, col] of drops) {
      try {
        await queryInterface.removeColumn(table, col);
      } catch (_) {
        // column may not exist if up was only partially applied
      }
    }
  },
};
