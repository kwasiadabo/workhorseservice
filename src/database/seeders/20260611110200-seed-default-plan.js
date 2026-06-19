const crypto = require('crypto');

const PLANS = [
  {
    name: 'Starter',
    description: 'Free trial tier — up to 5 employees, 1 branch',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'GH¢',
    maxBranches: 1,
    maxEmployees: 5,
    maxBookingsPerMonth: 200,
    features: JSON.stringify(['branches', 'employees', 'customers', 'services', 'bookings', 'payments']),
    isActive: true,
  },
  {
    name: 'Professional',
    description: 'Up to 20 employees, multiple branches',
    priceMonthly: 49,
    priceYearly: 490,
    currency: 'GH¢',
    maxBranches: 5,
    maxEmployees: 20,
    maxBookingsPerMonth: null,
    features: JSON.stringify(['branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'reports']),
    isActive: true,
  },
  {
    name: 'Enterprise',
    description: 'Unlimited employees and branches',
    priceMonthly: 149,
    priceYearly: 1490,
    currency: 'GH¢',
    maxBranches: null,
    maxEmployees: null,
    maxBookingsPerMonth: null,
    features: JSON.stringify([
      'branches',
      'employees',
      'customers',
      'services',
      'bookings',
      'payments',
      'reports',
      'priority_support',
    ]),
    isActive: true,
  },
];

module.exports = {
  up: async (queryInterface) => {
    const existing = await queryInterface.sequelize.query('SELECT name FROM Plans', {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const existingNames = new Set(existing.map((r) => r.name));
    const now = new Date();

    const rows = PLANS.filter((p) => !existingNames.has(p.name)).map((p) => ({
      id: crypto.randomUUID(),
      ...p,
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length) {
      await queryInterface.bulkInsert('Plans', rows);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Plans', { name: PLANS.map((p) => p.name) });
  },
};
