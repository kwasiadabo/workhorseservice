const { createCrudController } = require('../utils/crudController');
const vehicleTypesService = require('../services/vehicleTypes.service');

module.exports = createCrudController(vehicleTypesService);
