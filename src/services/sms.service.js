'use strict';

const { sequelize, Customer, Booking, Notification, SmsCampaign, User } = require('../models');
const { normalisePhone } = require('../utils/sms');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// Resolves the recipient customers for a campaign — tenant's customers with a
// phone number who haven't opted out, optionally restricted to customers
// with at least one booking at the given branch.
const getAudience = async (tenantId, { audienceType, branchId } = {}) => {
  const where = { tenantId, smsOptOut: false };

  if (audienceType === 'branch' && branchId) {
    const bookings = await Booking.findAll({
      where: { tenantId, branchId },
      attributes: ['customerId'],
      group: ['customerId'],
    });
    const customerIds = bookings.map((b) => b.customerId).filter(Boolean);
    if (!customerIds.length) return [];
    where.id = customerIds;
  }

  return Customer.findAll({ where, attributes: ['id', 'name', 'phone'] });
};

const previewAudience = async (tenantId, query) => {
  const audience = await getAudience(tenantId, query);
  return { recipientCount: audience.filter((c) => normalisePhone(c.phone)).length };
};

const sendCampaign = async (tenantId, user, { message, audienceType, branchId }) => {
  const audience = (await getAudience(tenantId, { audienceType, branchId })).filter((c) => normalisePhone(c.phone));

  const campaign = await sequelize.transaction(async (t) => {
    const records = audience.map((customer) => ({
      tenantId,
      customerId: customer.id,
      channel: 'sms',
      type: 'promotional',
      to: normalisePhone(customer.phone),
      body: message,
      status: 'pending',
      scheduledFor: new Date(),
    }));

    if (records.length) {
      await Notification.bulkCreate(records, { transaction: t });
    }

    return SmsCampaign.create(
      {
        tenantId,
        message,
        audienceType: audienceType || 'all',
        recipientCount: audience.length,
        sentBy: user.id,
        sentAt: new Date(),
      },
      { transaction: t }
    );
  });

  return campaign;
};

const listCampaigns = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);

  const { rows, count } = await SmsCampaign.findAndCountAll({
    where: { tenantId },
    include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] }],
    limit,
    offset,
    order: order || [['sentAt', 'DESC']],
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

module.exports = { previewAudience, sendCampaign, listCampaigns };
