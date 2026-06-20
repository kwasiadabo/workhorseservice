const { createCrudController } = require('../utils/crudController');
const vehiclesService = require('../services/vehicles.service');

module.exports = createCrudController(vehiclesService);
