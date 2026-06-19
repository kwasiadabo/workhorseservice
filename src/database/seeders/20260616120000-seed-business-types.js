const crypto = require('crypto');

const BUSINESS_TYPES = [
  { value: 'barbershop', label: 'Barbershop', displayOrder: 1 },
  { value: 'hair_salon', label: 'Hair Salon', displayOrder: 2 },
  { value: 'nail_studio', label: 'Nail Studio', displayOrder: 3 },
  { value: 'spa', label: 'Spa', displayOrder: 4 },
  { value: 'massage_center', label: 'Massage Center', displayOrder: 5 },
  { value: 'beauty_salon', label: 'Beauty Salon', displayOrder: 6 },
  { value: 'car_wash', label: 'Car Wash', displayOrder: 7 },
  { value: 'auto_detailing', label: 'Auto Detailing', displayOrder: 8 },
  { value: 'car_servicing', label: 'Car Servicing', displayOrder: 9 },
  { value: 'car_workshop', label: 'Car Workshop', displayOrder: 10 },
  { value: 'cleaning_service', label: 'Cleaning Service', displayOrder: 11 },
  { value: 'laundry', label: 'Laundry & Dry Cleaning', displayOrder: 12 },
  { value: 'tattoo_studio', label: 'Tattoo Studio', displayOrder: 13 },
  { value: 'fitness_center', label: 'Fitness Center', displayOrder: 14 },
  { value: 'other', label: 'Other', displayOrder: 99 },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    for (const type of BUSINESS_TYPES) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM BusinessTypes WHERE value = :value',
        { replacements: { value: type.value }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('BusinessTypes', [{
          id: crypto.randomUUID(),
          value: type.value,
          label: type.label,
          displayOrder: type.displayOrder,
          isActive: 1,
          createdAt: now,
          updatedAt: now,
        }]);
      }
    }
  },

  down: async (queryInterface) => {
    const values = BUSINESS_TYPES.map((t) => t.value);
    for (const value of values) {
      await queryInterface.bulkDelete('BusinessTypes', { value });
    }
  },
};
