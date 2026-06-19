/**
 * Phase 2 stub — Attendance
 *
 * Future schema (not yet enforced):
 *   employeeId        UUID          FK -> Employees.id (ON DELETE CASCADE)
 *   branchId          UUID          FK -> Branches.id (ON DELETE CASCADE)
 *   date              DATEONLY      NOT NULL
 *   checkInAt         DATE          NULL
 *   checkOutAt        DATE          NULL
 *   status            ENUM('present','absent','late','on_leave')  NOT NULL DEFAULT 'present'
 *
 * Unique constraint: (employeeId, date)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Attendance', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Attendance', ['tenantId'], { name: 'idx_attendance_tenant' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Attendance');
  },
};
