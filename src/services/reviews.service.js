'use strict';

const crypto = require('crypto');
const { sequelize, Rating, Booking, Customer, Employee, Tenant } = require('../models');
const ApiError = require('../utils/ApiError');
const { withTenantScope } = require('../utils/tenantScope');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// Called from payments.service.js after a booking completes (outside its
// payment transaction — not on the payment response's critical path).
// Creates a Rating stub with a unique review token so the customer can submit a review.
const createReviewRequest = async (tenantId, booking, transaction) => {
  if (!booking.customerId) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const rating = await Rating.create(
    { tenantId, bookingId: booking.id, customerId: booking.customerId, token },
    { transaction }
  );
  return { rating, token };
};

// Public: look up a review request by token
const getReviewByToken = async (token) => {
  const rating = await Rating.findOne({
    where: { token },
    include: [
      { model: Booking, attributes: ['id', 'bookingNumber', 'scheduledAt'] },
      { model: Customer, attributes: ['id', 'name'] },
      { model: Tenant, attributes: ['id', 'name', 'logoUrl'] },
      { model: Employee, attributes: ['id', 'firstName', 'lastName'] },
    ],
  });
  if (!rating) throw ApiError.notFound('Review link not found or already used');
  return rating;
};

// Public: submit a review
const submitReview = async (token, data) => {
  const rating = await Rating.findOne({ where: { token } });
  if (!rating) throw ApiError.notFound('Review link not found');
  if (rating.tokenUsedAt) throw ApiError.conflict('This review has already been submitted');

  await rating.update({
    stars: data.stars,
    comment: data.comment ?? null,
    tokenUsedAt: new Date(),
    employeeId: data.employeeId ?? rating.employeeId,
  });
  return rating;
};

// Tenant-scoped: list reviews
const list = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, { tokenUsedAt: { $ne: null } });

  const { rows, count } = await Rating.findAndCountAll({
    where,
    include: [
      { model: Customer, attributes: ['id', 'name'], paranoid: false },
      { model: Employee, attributes: ['id', 'firstName', 'lastName'], paranoid: false },
      { model: Booking, attributes: ['id', 'bookingNumber'], paranoid: false },
    ],
    limit,
    offset,
    order: order || [['createdAt', 'DESC']],
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

// Tenant-scoped: summary (avg stars, total count)
const getSummary = async (tenantId) => {
  const [row] = await sequelize.query(
    `SELECT AVG(CAST(stars AS FLOAT)) as avgStars, COUNT(*) as total
     FROM Ratings
     WHERE tenantId = :tenantId AND tokenUsedAt IS NOT NULL AND stars IS NOT NULL`,
    { replacements: { tenantId }, type: sequelize.constructor.QueryTypes.SELECT }
  );
  return { avgStars: row?.avgStars ? Number(row.avgStars).toFixed(1) : null, total: Number(row?.total ?? 0) };
};

module.exports = { createReviewRequest, getReviewByToken, submitReview, list, getSummary };
