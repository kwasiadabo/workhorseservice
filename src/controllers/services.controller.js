const { createCrudController } = require('../utils/crudController');
const servicesService = require('../services/services.service');

module.exports = createCrudController(servicesService);
