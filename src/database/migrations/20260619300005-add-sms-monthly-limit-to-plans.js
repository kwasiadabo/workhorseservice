'use strict';

// Adds a per-plan monthly SMS cap (Plan.smsMonthlyLimit), tracked against a
// calendar-month count of sent/queued Notification rows (see
// utils/planFeatures.js#getSmsUsage). null/unset = no cap (irrelevant for
// Basic, which doesn't have the 'sms' feature at all).

const LIMITS = { 'Business+': 4000, 'Advanced+': 10000 };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Plans', 'smsMonthlyLimit', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const { sequelize } = queryInterface;
    const now = new Date();
    for (const [name, smsMonthlyLimit] of Object.entries(LIMITS)) {
      await sequelize.query('UPDATE Plans SET smsMonthlyLimit = :smsMonthlyLimit, updatedAt = :now WHERE name = :name', {
        replacements: { smsMonthlyLimit, now, name },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Plans', 'smsMonthlyLimit');
  },
};
