'use strict';

const { Tenant, Customer, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const getSettings = async (tenantId) => {
  const tenant = await Tenant.findByPk(tenantId, {
    attributes: ['loyaltyThreshold', 'loyaltyRewardDescription'],
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  return tenant;
};

const updateSettings = async (tenantId, data) => {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) throw ApiError.notFound('Tenant not found');
  await tenant.update({
    loyaltyThreshold: data.loyaltyThreshold,
    loyaltyRewardDescription: data.loyaltyRewardDescription ?? null,
  });
  return { loyaltyThreshold: tenant.loyaltyThreshold, loyaltyRewardDescription: tenant.loyaltyRewardDescription };
};

const listCustomerPoints = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, {});
  if (query.search) where.name = { $like: `%${query.search}%` };

  const { rows, count } = await Customer.findAndCountAll({
    where,
    attributes: ['id', 'name', 'phone', 'email', 'loyaltyPoints'],
    limit,
    offset,
    order: order || [['loyaltyPoints', 'DESC']],
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

const redeemPoints = async (tenantId, customerId) => {
  const customer = await Customer.findByPk(customerId);
  assertTenantOwnership(customer, tenantId);

  const tenant = await Tenant.findByPk(tenantId, { attributes: ['loyaltyThreshold', 'loyaltyRewardDescription'] });
  if (customer.loyaltyPoints < tenant.loyaltyThreshold) {
    throw ApiError.badRequest(
      `Customer only has ${customer.loyaltyPoints} points; ${tenant.loyaltyThreshold} needed to redeem`
    );
  }

  await customer.decrement('loyaltyPoints', { by: tenant.loyaltyThreshold });
  await customer.reload();
  return { loyaltyPoints: customer.loyaltyPoints, reward: tenant.loyaltyRewardDescription };
};

module.exports = { getSettings, updateSettings, listCustomerPoints, redeemPoints };
