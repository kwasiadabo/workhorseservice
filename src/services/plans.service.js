const { Plan } = require('../models');
const ApiError = require('../utils/ApiError');

const listActive = () =>
  Plan.findAll({
    where: { isActive: true },
    order: [['priceMonthly', 'ASC']],
    attributes: ['id', 'name', 'description', 'priceMonthly', 'priceYearly', 'currency',
      'maxBranches', 'maxEmployees', 'maxBookingsPerMonth', 'smsMonthlyLimit', 'features'],
  });

const getById = async (id) => {
  const plan = await Plan.findByPk(id);
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
};

module.exports = { listActive, getById };
