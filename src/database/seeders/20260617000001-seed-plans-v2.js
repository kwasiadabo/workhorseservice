const crypto = require('crypto');

const NEW_PLANS = [
  {
    name: 'Basic',
    description: 'Perfect for single-location service businesses starting out.',
    priceMonthly: 99,
    priceYearly: 990,
    currency: 'GH¢',
    maxBranches: 1,
    maxEmployees: 15,
    maxBookingsPerMonth: 500,
    features: JSON.stringify(['branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses']),
    isActive: 1,
  },
  {
    name: 'Business+',
    description: 'For growing businesses managing multiple locations and larger teams.',
    priceMonthly: 249,
    priceYearly: 2490,
    currency: 'GH¢',
    maxBranches: 5,
    maxEmployees: 50,
    maxBookingsPerMonth: null,
    features: JSON.stringify([
      'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
      'reports', 'expense_report', 'analytics', 'sms',
    ]),
    isActive: 1,
  },
  {
    name: 'Advanced+',
    description: 'Unlimited scale for enterprise service businesses with no restrictions.',
    priceMonthly: 499,
    priceYearly: 4990,
    currency: 'GH¢',
    maxBranches: null,
    maxEmployees: null,
    maxBookingsPerMonth: null,
    features: JSON.stringify([
      'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
      'reports', 'expense_report', 'analytics', 'priority_support', 'advanced_analytics', 'sms',
    ]),
    isActive: 1,
  },
];

const OLD_PLAN_NAMES = ['Starter', 'Professional', 'Enterprise'];

module.exports = {
  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const now = new Date();

    // Deactivate old plans using raw SQL (avoids MSSQL BIT type issues with bulkUpdate)
    for (const name of OLD_PLAN_NAMES) {
      await sequelize.query(
        'UPDATE Plans SET isActive = 0, updatedAt = :now WHERE name = :name',
        { replacements: { now, name } }
      );
    }

    // Insert new plans that don't already exist
    for (const plan of NEW_PLANS) {
      const [existing] = await sequelize.query(
        'SELECT id FROM Plans WHERE name = :name',
        { replacements: { name: plan.name }, type: sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('Plans', [{
          id: crypto.randomUUID(),
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxBranches: plan.maxBranches,
          maxEmployees: plan.maxEmployees,
          maxBookingsPerMonth: plan.maxBookingsPerMonth,
          features: plan.features,
          isActive: plan.isActive,
          createdAt: now,
          updatedAt: now,
        }]);
      }
    }
  },

  down: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const now = new Date();
    for (const plan of NEW_PLANS) {
      await queryInterface.bulkDelete('Plans', { name: plan.name });
    }
    for (const name of OLD_PLAN_NAMES) {
      await sequelize.query(
        'UPDATE Plans SET isActive = 1, updatedAt = :now WHERE name = :name',
        { replacements: { now, name } }
      );
    }
  },
};
