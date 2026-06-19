module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MSSQL requires a default for NOT NULL columns added to existing tables.
    // We set explicit defaults here so the backfill is deterministic.
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await queryInterface.addColumn('Subscriptions', 'planId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Plans', key: 'id' },
    });

    await queryInterface.addColumn('Subscriptions', 'status', {
      type: Sequelize.ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'trialing',
    });

    await queryInterface.addColumn('Subscriptions', 'currentPeriodStart', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: now,
    });

    await queryInterface.addColumn('Subscriptions', 'currentPeriodEnd', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: thirtyDaysOut,
    });

    await queryInterface.addColumn('Subscriptions', 'trialStartedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Subscriptions', 'trialSkipped', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Subscriptions', 'cancelAtPeriodEnd', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Subscriptions', 'cancelAtPeriodEnd');
    await queryInterface.removeColumn('Subscriptions', 'trialSkipped');
    await queryInterface.removeColumn('Subscriptions', 'trialStartedAt');
    await queryInterface.removeColumn('Subscriptions', 'currentPeriodEnd');
    await queryInterface.removeColumn('Subscriptions', 'currentPeriodStart');
    await queryInterface.removeColumn('Subscriptions', 'status');
    await queryInterface.removeColumn('Subscriptions', 'planId');
  },
};
