const { createCrudController } = require('../utils/crudController');
const asyncHandler = require('../utils/asyncHandler');
const employeesService = require('../services/employees.service');

const controller = createCrudController(employeesService);

controller.me = asyncHandler(async (req, res) => {
  const employee = await employeesService.getMyRecord(req.tenantId, req.user.id);
  res.json({ success: true, data: employee });
});

module.exports = controller;
