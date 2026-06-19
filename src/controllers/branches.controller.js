const { createCrudController } = require('../utils/crudController');
const branchesService = require('../services/branches.service');

module.exports = createCrudController(branchesService);
