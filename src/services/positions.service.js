const { Position } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(Position, {
  searchableFields: ['name'],
  defaultOrder: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
});
