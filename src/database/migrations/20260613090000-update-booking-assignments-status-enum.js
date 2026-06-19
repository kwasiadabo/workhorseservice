// BookingAssignments.status renames 'assigned' to 'waiting' — the status a
// newly-created assignment starts in, before work begins. `status` is
// emulated on mssql via NVARCHAR + an auto-named CHECK constraint (see
// attributeToSQL in dialects/mssql/query-generator.js), so the constraint
// must be dropped and recreated — same approach as
// 20260612130000-update-bookings-status-enum.js.
module.exports = {
  up: async (queryInterface) => {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT cc.name FROM sys.check_constraints cc
      INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('BookingAssignments') AND c.name = 'status'
    `);
    for (const { name } of constraints) {
      await queryInterface.sequelize.query(`ALTER TABLE [BookingAssignments] DROP CONSTRAINT [${name}]`);
    }

    await queryInterface.sequelize.query(
      "UPDATE [BookingAssignments] SET [status] = 'waiting' WHERE [status] = 'assigned'"
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE [BookingAssignments] ADD CONSTRAINT [CK_BookingAssignments_status]
      CHECK ([status] IN('waiting','in_progress','completed','cancelled'))
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE [BookingAssignments] DROP CONSTRAINT [CK_BookingAssignments_status]');

    await queryInterface.sequelize.query(
      "UPDATE [BookingAssignments] SET [status] = 'assigned' WHERE [status] = 'waiting'"
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE [BookingAssignments] ADD
      CHECK ([status] IN('assigned','in_progress','completed','cancelled'))
    `);
  },
};
