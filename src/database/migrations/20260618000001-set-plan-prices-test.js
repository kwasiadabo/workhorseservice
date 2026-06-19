const PLAN_NAMES = ['Basic', 'Business+', 'Advanced+'];

module.exports = {
  up: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const now = new Date();
    for (const name of PLAN_NAMES) {
      await sequelize.query(
        'UPDATE Plans SET priceMonthly = 1, priceYearly = 1, updatedAt = :now WHERE name = :name',
        { replacements: { now, name } },
      );
    }
  },

  down: async (queryInterface) => {
    const { sequelize } = queryInterface;
    const now = new Date();
    const originals = { Basic: [99, 990], 'Business+': [249, 2490], 'Advanced+': [499, 4990] };
    for (const [name, [monthly, yearly]] of Object.entries(originals)) {
      await sequelize.query(
        'UPDATE Plans SET priceMonthly = :monthly, priceYearly = :yearly, updatedAt = :now WHERE name = :name',
        { replacements: { monthly, yearly, now, name } },
      );
    }
  },
};
