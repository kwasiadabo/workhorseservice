const crypto = require('crypto');
const { PERMISSIONS } = require('../../config/permissions');

module.exports = {
  up: async (queryInterface) => {
    const existing = await queryInterface.sequelize.query('SELECT [key] FROM Permissions', {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const existingKeys = new Set(existing.map((r) => r.key));
    const now = new Date();

    const rows = PERMISSIONS.filter((p) => !existingKeys.has(p.key)).map((p) => ({
      id: crypto.randomUUID(),
      key: p.key,
      description: p.description,
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length) {
      await queryInterface.bulkInsert('Permissions', rows);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Permissions', { key: PERMISSIONS.map((p) => p.key) });
  },
};
