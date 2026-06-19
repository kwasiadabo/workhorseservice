// Bookings.status moves from the old 6-value enum (which included an unused
// 'pending') to a 4-stage workflow plus the two exception statuses:
// confirmed -> in_progress -> awaiting_payment -> completed, or
// cancelled/no_show. `status` is emulated on mssql via NVARCHAR + an
// auto-named CHECK constraint (see attributeToSQL in
// dialects/mssql/query-generator.js), so the constraint must be dropped and
// recreated — same approach as the `gender` column in
// 20260612120000-update-customers-name-and-phone.js.
module.exports = {
  up: async (queryInterface) => {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT cc.name FROM sys.check_constraints cc
      INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('Bookings') AND c.name = 'status'
    `);
    for (const { name } of constraints) {
      await queryInterface.sequelize.query(`ALTER TABLE [Bookings] DROP CONSTRAINT [${name}]`);
    }

    // 'pending' is being removed from the enum; no booking should have it
    // (new bookings are always created as 'confirmed'), but convert
    // defensively so the new CHECK constraint can't be violated.
    await queryInterface.sequelize.query("UPDATE [Bookings] SET [status] = 'confirmed' WHERE [status] = 'pending'");

    await queryInterface.sequelize.query(`
      ALTER TABLE [Bookings] ADD CONSTRAINT [CK_Bookings_status]
      CHECK ([status] IN('confirmed','in_progress','awaiting_payment','completed','cancelled','no_show'))
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE [Bookings] DROP CONSTRAINT [CK_Bookings_status]');

    // 'awaiting_payment' doesn't exist in the old enum — fold it back into
    // 'in_progress' so existing rows remain valid under the old constraint.
    await queryInterface.sequelize.query(
      "UPDATE [Bookings] SET [status] = 'in_progress' WHERE [status] = 'awaiting_payment'"
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE [Bookings] ADD
      CHECK ([status] IN('pending','confirmed','in_progress','completed','cancelled','no_show'))
    `);
  },
};
