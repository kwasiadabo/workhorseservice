'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, def) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
      );
      if (!rows.length) await queryInterface.addColumn(table, column, def);
    };

    await addIfMissing('Ratings', 'bookingId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Bookings', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await addIfMissing('Ratings', 'customerId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Customers', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await addIfMissing('Ratings', 'employeeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Employees', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await addIfMissing('Ratings', 'stars', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await addIfMissing('Ratings', 'comment', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addIfMissing('Ratings', 'token', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await addIfMissing('Ratings', 'tokenUsedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Unique index on token for fast lookup
    const [idxRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM sys.indexes WHERE name = 'idx_ratings_token' AND object_id = OBJECT_ID('Ratings')`
    );
    if (!idxRows.length) {
      await queryInterface.addIndex('Ratings', ['token'], {
        name: 'idx_ratings_token',
        unique: true,
        where: { token: { [Symbol.for('not')]: null } },
      });
    }
  },

  async down(queryInterface) {
    for (const col of ['tokenUsedAt', 'token', 'comment', 'stars', 'employeeId', 'customerId', 'bookingId']) {
      try {
        await queryInterface.removeColumn('Ratings', col);
      } catch (_) {}
    }
  },
};
