const { Op } = require('sequelize');
const { Tenant, Plan, Subscription, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const list = async (query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = {};

  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
      { slug: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Tenant.findAndCountAll({
    where,
    include: [{ model: Plan }],
    limit,
    offset,
    order: order || [['name', 'ASC']],
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

const getById = async (id) => {
  const tenant = await Tenant.findByPk(id, {
    include: [
      { model: Plan },
      {
        model: Subscription,
        as: 'subscription',
        include: [{ model: Plan, as: 'plan', attributes: ['id', 'name', 'priceMonthly', 'priceYearly', 'currency'] }],
      },
      { model: User, attributes: ['id', 'email', 'firstName', 'lastName', 'isActive', 'lastLoginAt'] },
    ],
  });
  if (!tenant) {
    throw ApiError.notFound('Tenant not found');
  }
  return tenant;
};

const update = async (id, data) => {
  const tenant = await getById(id);
  await tenant.update(data);
  return tenant;
};

// The Tenants table is not soft-deletable; "removing" a tenant from the
// platform side means cancelling its access rather than deleting its data.
const remove = async (id) => {
  const tenant = await getById(id);
  await tenant.update({ status: 'cancelled' });
  return tenant;
};

module.exports = { list, getById, update, remove };
