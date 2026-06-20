const { Vehicle } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(Vehicle, {
  searchableFields: ['registration', 'make', 'model'],
  defaultOrder: [['createdAt', 'DESC']],
  buildWhere: (query) => {
    const where = {};
    if (query.customerId) where.customerId = query.customerId;
    return where;
  },
});
