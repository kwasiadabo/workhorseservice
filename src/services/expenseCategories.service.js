const { ExpenseCategory } = require('../models');
const { createCrudService } = require('../utils/crudService');

module.exports = createCrudService(ExpenseCategory, {
  searchableFields: ['name'],
  defaultOrder: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
});
