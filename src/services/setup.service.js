const { Branch, ServiceCategory, Service, Employee } = require('../models');

// Drives both the forced first-login checklist (all four) and the
// booking-creation guard (branches/services/employees only — see
// bookings.service.js#create; a Service can legally have no category).
const getStatus = async (tenantId) => {
  const [branchCount, serviceCategoryCount, serviceCount, employeeCount] = await Promise.all([
    Branch.count({ where: { tenantId } }),
    ServiceCategory.count({ where: { tenantId } }),
    Service.count({ where: { tenantId } }),
    Employee.count({ where: { tenantId } }),
  ]);

  const status = {
    branches: branchCount > 0,
    serviceCategories: serviceCategoryCount > 0,
    services: serviceCount > 0,
    employees: employeeCount > 0,
  };

  return { ...status, complete: Object.values(status).every(Boolean) };
};

module.exports = { getStatus };
