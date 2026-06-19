const crypto = require('crypto');
const { ROLES } = require('../../config/permissions');

const ROLE_DESCRIPTIONS = {
  super_admin: 'Platform-level administrator: manages tenants, plans and platform settings',
  tenant_owner: 'Owner of a tenant business: full access to that tenant’s data',
  manager: 'Manages bookings, staff assignments and day-to-day operations for a tenant',
  receptionist: 'Front-desk staff: registers customers, creates bookings, processes payments',
  employee: 'Staff member who delivers services and views their own assignments/earnings',
};

module.exports = {
  up: async (queryInterface) => {
    const existing = await queryInterface.sequelize.query('SELECT name FROM Roles', {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const existingNames = new Set(existing.map((r) => r.name));
    const now = new Date();

    const rows = ROLES.filter((name) => !existingNames.has(name)).map((name) => ({
      id: crypto.randomUUID(),
      name,
      description: ROLE_DESCRIPTIONS[name] || null,
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length) {
      await queryInterface.bulkInsert('Roles', rows);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Roles', { name: ROLES });
  },
};
