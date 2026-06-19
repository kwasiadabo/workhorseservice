module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Customers', 'name', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.sequelize.query(
      "UPDATE [Customers] SET [name] = LTRIM(RTRIM([firstName] + ' ' + ISNULL([lastName], '')))"
    );
    await queryInterface.changeColumn('Customers', 'name', { type: Sequelize.STRING(200), allowNull: false });

    await queryInterface.sequelize.query("UPDATE [Customers] SET [phone] = '' WHERE [phone] IS NULL");

    // idx_customers_tenant_phone is dependent on `phone`; SQL Server refuses
    // ALTER COLUMN on an indexed column, so drop and recreate it around the change.
    await queryInterface.removeIndex('Customers', 'idx_customers_tenant_phone');
    await queryInterface.changeColumn('Customers', 'phone', { type: Sequelize.STRING(30), allowNull: false });
    await queryInterface.addIndex('Customers', ['tenantId', 'phone'], { name: 'idx_customers_tenant_phone' });

    await queryInterface.removeColumn('Customers', 'firstName');
    await queryInterface.removeColumn('Customers', 'lastName');
    await queryInterface.removeColumn('Customers', 'dateOfBirth');

    // `gender` is an ENUM, emulated on mssql via a server-generated CHECK
    // constraint that must be dropped before the column can be removed.
    const [genderConstraints] = await queryInterface.sequelize.query(`
      SELECT cc.name FROM sys.check_constraints cc
      INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('Customers') AND c.name = 'gender'
    `);
    for (const { name } of genderConstraints) {
      await queryInterface.sequelize.query(`ALTER TABLE [Customers] DROP CONSTRAINT [${name}]`);
    }
    await queryInterface.removeColumn('Customers', 'gender');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Customers', 'firstName', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('Customers', 'lastName', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('Customers', 'dateOfBirth', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('Customers', 'gender', {
      type: Sequelize.ENUM('male', 'female', 'other', 'unspecified'),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE [Customers] SET
        [firstName] = CASE WHEN CHARINDEX(' ', [name]) > 0 THEN LEFT([name], CHARINDEX(' ', [name]) - 1) ELSE [name] END,
        [lastName] = CASE WHEN CHARINDEX(' ', [name]) > 0 THEN LTRIM(SUBSTRING([name], CHARINDEX(' ', [name]) + 1, LEN([name]))) ELSE NULL END
    `);
    await queryInterface.changeColumn('Customers', 'firstName', { type: Sequelize.STRING(100), allowNull: false });

    // Drop/recreate the index around the column change for the same reason as in `up`.
    await queryInterface.removeIndex('Customers', 'idx_customers_tenant_phone');
    await queryInterface.changeColumn('Customers', 'phone', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addIndex('Customers', ['tenantId', 'phone'], { name: 'idx_customers_tenant_phone' });

    await queryInterface.removeColumn('Customers', 'name');
  },
};
