const { createCrudController } = require('../utils/crudController');
const serviceCategoriesService = require('../services/serviceCategories.service');

module.exports = createCrudController(serviceCategoriesService);
