const { Customer } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(Customer, {
  searchableFields: ['name', 'phone', 'email'],
  defaultOrder: [['name', 'ASC']],
});
