const { ServiceCategory } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(ServiceCategory, {
  searchableFields: ['name'],
  defaultOrder: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
});
