const { Branch } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(Branch, {
  searchableFields: ['name', 'city'],
  defaultOrder: [['name', 'ASC']],
});
