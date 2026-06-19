const { Bank } = require('../models');
const { createCrudService } = require('../utils/crudService');

const base = createCrudService(Bank, {
  searchableFields: ['name', 'shortCode'],
  defaultOrder: [['displayOrder', 'ASC'], ['name', 'ASC']],
});

module.exports = { ...base };
