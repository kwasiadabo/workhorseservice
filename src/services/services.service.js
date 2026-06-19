const { Service, ServiceCategory, ServiceVehiclePrice, VehicleType, sequelize } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');

const vehiclePriceInclude = {
  model: ServiceVehiclePrice,
  as: 'vehiclePrices',
  include: [{ model: VehicleType, attributes: ['id', 'name', 'displayOrder'] }],
};

const base = createCrudService(Service, {
  searchableFields: ['name'],
  defaultOrder: [['name', 'ASC']],
  include: [vehiclePriceInclude],
  buildWhere: (query) => {
    const where = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return where;
  },
});

const verifyCategory = async (tenantId, categoryId) => {
  if (!categoryId) return;
  const category = await ServiceCategory.findByPk(categoryId);
  assertTenantOwnership(category, tenantId);
};

const syncVehiclePrices = async (tenantId, serviceId, vehiclePrices, transaction) => {
  if (vehiclePrices === undefined) return;
  await ServiceVehiclePrice.destroy({ where: { serviceId }, transaction });
  if (vehiclePrices.length > 0) {
    await ServiceVehiclePrice.bulkCreate(
      vehiclePrices.map((vp) => ({ tenantId, serviceId, vehicleTypeId: vp.vehicleTypeId, price: vp.price })),
      { transaction }
    );
  }
};

const create = async (tenantId, data) => {
  const { vehiclePrices, ...rest } = data;
  await verifyCategory(tenantId, rest.categoryId);
  const service = await sequelize.transaction(async (t) => {
    const svc = await Service.create({ ...rest, tenantId }, { transaction: t });
    await syncVehiclePrices(tenantId, svc.id, vehiclePrices, t);
    return svc;
  });
  return base.getById(tenantId, service.id);
};

const update = async (tenantId, id, data) => {
  const { vehiclePrices, ...rest } = data;
  if (rest.categoryId !== undefined) {
    await verifyCategory(tenantId, rest.categoryId);
  }
  const service = await sequelize.transaction(async (t) => {
    const svc = await base.getById(tenantId, id);
    if (Object.keys(rest).length > 0) await svc.update(rest, { transaction: t });
    await syncVehiclePrices(tenantId, id, vehiclePrices, t);
    return svc;
  });
  return base.getById(tenantId, service.id);
};

module.exports = { ...base, create, update };
