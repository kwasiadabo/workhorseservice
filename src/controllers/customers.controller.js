const { createCrudController } = require('../utils/crudController');
const customersService = require('../services/customers.service');

module.exports = createCrudController(customersService);
