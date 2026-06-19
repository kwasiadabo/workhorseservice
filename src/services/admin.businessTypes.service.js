const { Op } = require('sequelize');
const { BusinessType } = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const DEFAULT_ORDER = [
  ['displayOrder', 'ASC'],
  ['label', 'ASC'],
];

const list = async (query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = {};

  if (query.search) {
    where[Op.or] = [
      { value: { [Op.like]: `%${query.search}%` } },
      { label: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await BusinessType.findAndCountAll({
    where,
    limit,
    offset,
    order: order || DEFAULT_ORDER,
  });

  return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
};

const listActive = async () =>
  BusinessType.findAll({ where: { isActive: true }, order: DEFAULT_ORDER });

const getById = async (id) => {
  const record = await BusinessType.findByPk(id);
  if (!record) throw ApiError.notFound('Business type not found');
  return record;
};

const create = async (data) => {
  const existing = await BusinessType.findOne({ where: { value: data.value } });
  if (existing) throw ApiError.conflict('A business type with this value already exists');
  return BusinessType.create(data);
};

const update = async (id, data) => {
  const record = await getById(id);
  if (data.value && data.value !== record.value) {
    const existing = await BusinessType.findOne({ where: { value: data.value } });
    if (existing) throw ApiError.conflict('A business type with this value already exists');
  }
  await record.update(data);
  return record;
};

const remove = async (id) => {
  const record = await getById(id);
  await record.destroy();
};

module.exports = { list, listActive, getById, create, update, remove };
