'use strict';

// Adds the 'sms' feature key to Business+ and Advanced+ plan rows that were
// already seeded (the seeder itself only inserts plans that don't yet exist,
// so it won't pick up this change on already-provisioned databases — see
// 20260618000001-set-plan-prices-test.js for the same pattern).

const FEATURES = {
  'Business+': [
    'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
    'reports', 'expense_report', 'analytics', 'sms',
  ],
  'Advanced+': [
    'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
    'reports', 'expense_report', 'analytics', 'priority_support', 'advanced_analytics', 'sms',
  ],
};

const PREVIOUS_FEATURES = {
  'Business+': [
    'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
    'reports', 'expense_report', 'analytics',
  ],
  'Advanced+': [
    'branches', 'employees', 'customers', 'services', 'bookings', 'payments', 'expenses',
    'reports', 'expense_report', 'analytics', 'priority_support', 'advanced_analytics',
  ],
};

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();
    for (const [name, features] of Object.entries(FEATURES)) {
      await sequelize.query(
        'UPDATE Plans SET features = :features, updatedAt = :now WHERE name = :name',
        { replacements: { features: JSON.stringify(features), now, name } }
      );
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();
    for (const [name, features] of Object.entries(PREVIOUS_FEATURES)) {
      await sequelize.query(
        'UPDATE Plans SET features = :features, updatedAt = :now WHERE name = :name',
        { replacements: { features: JSON.stringify(features), now, name } }
      );
    }
  },
};
