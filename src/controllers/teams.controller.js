const { createCrudController } = require('../utils/crudController');
const teamsService = require('../services/teams.service');

module.exports = createCrudController(teamsService);
