'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, def) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
      );
      if (!rows.length) await queryInterface.addColumn(table, column, def);
    };

    await addIfMissing('Tenants', 'loyaltyThreshold', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10,
    });
    await addIfMissing('Tenants', 'loyaltyRewardDescription', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    for (const col of ['loyaltyRewardDescription', 'loyaltyThreshold']) {
      try {
        await queryInterface.removeColumn('Tenants', col);
      } catch {
        // column may not exist if up was only partially applied
      }
    }
  },
};
