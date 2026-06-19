// `bookingNumber` (BK-<YYYYMMDD>-<NNNN>) is generated per-tenant per-day
// (bookings.service.js#generateBookingNumber), so it can only be unique
// within a tenant — a global UNIQUE constraint on the column alone causes
// cross-tenant collisions (e.g. every tenant's first booking of the day is
// BK-<today>-0001). Replace it with a composite (tenantId, bookingNumber)
// unique index.
module.exports = {
  up: async (queryInterface) => {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT kc.name AS constraintName
      FROM sys.key_constraints kc
      INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
      INNER JOIN sys.index_columns ic ON ic.object_id = t.object_id AND ic.index_id = kc.unique_index_id
      INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
      WHERE t.name = 'Bookings' AND kc.type = 'UQ' AND c.name = 'bookingNumber'
    `);

    for (const { constraintName } of constraints) {
      await queryInterface.sequelize.query(`ALTER TABLE [Bookings] DROP CONSTRAINT [${constraintName}]`);
    }

    await queryInterface.addIndex('Bookings', ['tenantId', 'bookingNumber'], {
      unique: true,
      name: 'uq_bookings_tenant_booking_number',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Bookings', 'uq_bookings_tenant_booking_number');
    await queryInterface.sequelize.query(
      'ALTER TABLE [Bookings] ADD CONSTRAINT [UQ_Bookings_bookingNumber] UNIQUE ([bookingNumber])'
    );
  },
};
