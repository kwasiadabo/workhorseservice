const { VehicleType } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(VehicleType, {
  searchableFields: ['name'],
  defaultOrder: [
    ['displayOrder', 'ASC'],
    ['createdAt', 'ASC'],
  ],
});
