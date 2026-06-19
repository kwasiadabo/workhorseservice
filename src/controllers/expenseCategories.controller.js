const { createCrudController } = require('../utils/crudController');
const expenseCategoriesService = require('../services/expenseCategories.service');

module.exports = createCrudController(expenseCategoriesService);
