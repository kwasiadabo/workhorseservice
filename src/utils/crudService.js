const { Op } = require('sequelize');
const { parsePagination, buildPaginationMeta } = require('./pagination');
const { withTenantScope, assertTenantOwnership } = require('./tenantScope');

// Builds a tenant-scoped list/create/getById/update/remove service for a
// simple CRUD resource (Branches, Customers, ServiceCategories, Services).
// Resources with cross-entity business logic (Bookings, Payments, Employees)
// build on top of this rather than using it as-is.
const createCrudService = (Model, { defaultOrder = [['createdAt', 'DESC']], searchableFields = [], buildWhere, include } = {}) => {
  const list = async (tenantId, query = {}) => {
    const { page, limit, offset, order } = parsePagination(query);
    const where = withTenantScope(tenantId, {});

    if (query.search && searchableFields.length) {
      where[Op.or] = searchableFields.map((field) => ({ [field]: { [Op.like]: `%${query.search}%` } }));
    }

    if (buildWhere) {
      Object.assign(where, buildWhere(query));
    }

    const { rows, count } = await Model.findAndCountAll({
      where,
      limit,
      offset,
      order: order || defaultOrder,
      include,
      distinct: Boolean(include),
    });

    return { items: rows, meta: buildPaginationMeta({ page, limit, count }) };
  };

  const create = (tenantId, data) => Model.create({ ...data, tenantId });

  const getById = async (tenantId, id) => {
    const record = await Model.findByPk(id, { include });
    return assertTenantOwnership(record, tenantId);
  };

  const update = async (tenantId, id, data) => {
    const record = await getById(tenantId, id);
    await record.update(data);
    return record;
  };

  const remove = async (tenantId, id) => {
    const record = await getById(tenantId, id);
    await record.destroy();
  };

  return { list, create, getById, update, remove };
};

module.exports = { createCrudService };
