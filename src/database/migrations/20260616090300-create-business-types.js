const { randomUUID } = require('crypto');

const SEED_TYPES = [
  { value: 'barbershop', label: 'Barbershop', displayOrder: 0 },
  { value: 'salon', label: 'Salon', displayOrder: 1 },
  { value: 'spa', label: 'Spa', displayOrder: 2 },
  { value: 'car_wash', label: 'Car Wash', displayOrder: 3 },
  { value: 'nail_studio', label: 'Nail Studio', displayOrder: 4 },
  { value: 'cleaning', label: 'Cleaning Service', displayOrder: 5 },
  { value: 'massage', label: 'Massage Center', displayOrder: 6 },
  { value: 'other', label: 'Other', displayOrder: 7 },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BusinessTypes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      value: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(150), allowNull: false },
      displayOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('BusinessTypes', ['value'], { name: 'idx_business_types_value', unique: true });

    const now = new Date();
    await queryInterface.bulkInsert(
      'BusinessTypes',
      SEED_TYPES.map((t) => ({
        id: randomUUID(),
        value: t.value,
        label: t.label,
        displayOrder: t.displayOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
    );

    // Drop the auto-generated MSSQL CHECK constraint that backed the ENUM.
    // The constraint name is system-generated, so we find it dynamically.
    await queryInterface.sequelize.query(`
      DECLARE @cn NVARCHAR(256);
      SELECT @cn = cc.name
      FROM sys.check_constraints cc
      JOIN sys.columns col
        ON cc.parent_object_id = col.object_id
       AND cc.parent_column_id = col.column_id
      JOIN sys.tables t ON col.object_id = t.object_id
      WHERE t.name = 'Tenants' AND col.name = 'businessType';
      IF @cn IS NOT NULL
        EXEC('ALTER TABLE [Tenants] DROP CONSTRAINT [' + @cn + ']');
    `);
  },

  down: async (queryInterface) => {
    // Re-add the CHECK constraint (existing rows with custom values will fail
    // validation if they don't match the original enum — acceptable for rollback).
    await queryInterface.sequelize.query(`
      ALTER TABLE [Tenants]
      ADD CONSTRAINT CK_Tenants_businessType
      CHECK ([businessType] IN (
        N'barbershop', N'salon', N'spa', N'car_wash',
        N'nail_studio', N'cleaning', N'massage', N'other'
      ));
    `);

    await queryInterface.dropTable('BusinessTypes');
  },
};
