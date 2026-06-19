const { createCrudController } = require('../utils/crudController');
const banksService = require('../services/banks.service');

module.exports = createCrudController(banksService);
