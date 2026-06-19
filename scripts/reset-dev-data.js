/**
 * Dev-only data reset: wipes all tenant data (bookings, payments, tenants, users, etc.)
 * Keeps: Plans, Roles, Permissions, super_admin User + their UserRoles + RefreshTokens
 *
 * Usage: node scripts/reset-dev-data.js
 */

require('dotenv').config();
const db = require('../src/models');
const { Op } = require('sequelize');
const { sequelize } = db;

const {
  BookingAssignment,
  Payment,
  BookingService,
  Booking,
  CashHandover,
  Expense,
  Employee,
  Service,
  ServiceCategory,
  ServiceVehiclePrice,
  Customer,
  VehicleType,
  Position,
  ExpenseCategory,
  Branch,
  RefreshToken,
  UserRole,
  User,
  Tenant,
} = db;

async function reset() {
  await sequelize.authenticate();
  console.log('DB connected.\n');

  const t = await sequelize.transaction();
  try {
    const d = (model, opts = {}) =>
      model.destroy({ where: {}, transaction: t, ...opts });

    // Booking sub-resources
    const ba = await d(BookingAssignment);
    const pay = await d(Payment);
    const bs = await d(BookingService);
    const bk = await d(Booking, { force: true });

    // Other tenant data
    const ch = await d(CashHandover);
    const ex = await d(Expense);
    const emp = await d(Employee, { force: true });
    const svp = await d(ServiceVehiclePrice);
    const svc = await d(Service, { force: true });
    const sc = await d(ServiceCategory, { force: true });
    const cust = await d(Customer, { force: true });
    const vt = await d(VehicleType, { force: true });
    const pos = await d(Position, { force: true });
    const ec = await d(ExpenseCategory, { force: true });
    const br = await d(Branch, { force: true });

    // Users (keep super_admin: tenantId IS NULL)
    // Delete RefreshTokens for tenant users first, then tenant users' UserRoles, then the users
    const tenantUserIds = (
      await User.findAll({
        where: { tenantId: { [Op.ne]: null } },
        attributes: ['id'],
        paranoid: false,
        transaction: t,
      })
    ).map((u) => u.id);

    let rt = 0, ur = 0, us = 0;
    if (tenantUserIds.length) {
      rt = await RefreshToken.destroy({ where: { userId: { [Op.in]: tenantUserIds } }, transaction: t });
      ur = await UserRole.destroy({ where: { userId: { [Op.in]: tenantUserIds } }, transaction: t });
      us = await User.destroy({ where: { tenantId: { [Op.ne]: null } }, force: true, transaction: t });
    }

    const ten = await d(Tenant);

    await t.commit();

    console.log('Reset complete:');
    console.log(`  BookingAssignments : ${ba}`);
    console.log(`  Payments           : ${pay}`);
    console.log(`  BookingServices    : ${bs}`);
    console.log(`  Bookings           : ${bk}`);
    console.log(`  CashHandovers      : ${ch}`);
    console.log(`  Expenses           : ${ex}`);
    console.log(`  Employees          : ${emp}`);
    console.log(`  ServiceVehiclePrices: ${svp}`);
    console.log(`  Services           : ${svc}`);
    console.log(`  ServiceCategories  : ${sc}`);
    console.log(`  Customers          : ${cust}`);
    console.log(`  VehicleTypes       : ${vt}`);
    console.log(`  Positions          : ${pos}`);
    console.log(`  ExpenseCategories  : ${ec}`);
    console.log(`  Branches           : ${br}`);
    console.log(`  RefreshTokens      : ${rt}`);
    console.log(`  UserRoles          : ${ur}`);
    console.log(`  Users (tenant)     : ${us}`);
    console.log(`  Tenants            : ${ten}`);
    console.log('\nsuper_admin preserved. Re-run seeds if needed for plans/roles/permissions.');
  } catch (err) {
    await t.rollback();
    console.error('Reset failed — rolled back:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

reset();
