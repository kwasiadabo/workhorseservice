const { createCrudController } = require('../utils/crudController');
const positionsService = require('../services/positions.service');

module.exports = createCrudController(positionsService);
