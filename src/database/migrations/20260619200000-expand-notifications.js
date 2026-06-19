'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, def) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`
      );
      if (!rows.length) await queryInterface.addColumn(table, column, def);
    };

    await addIfMissing('Notifications', 'bookingId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Bookings', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await addIfMissing('Notifications', 'customerId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Customers', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await addIfMissing('Notifications', 'channel', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'sms',
    });
    // booking_confirmation | reminder_24h | reminder_1h | review_request
    await addIfMissing('Notifications', 'type', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'booking_confirmation',
    });
    await addIfMissing('Notifications', 'to', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await addIfMissing('Notifications', 'body', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addIfMissing('Notifications', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    });
    await addIfMissing('Notifications', 'scheduledFor', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addIfMissing('Notifications', 'sentAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addIfMissing('Notifications', 'messageId', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await addIfMissing('Notifications', 'error', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    // Index for the cron query: pending notifications due to send
    const [idxRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_pending' AND object_id = OBJECT_ID('Notifications')`
    );
    if (!idxRows.length) {
      await queryInterface.addIndex('Notifications', ['status', 'scheduledFor'], {
        name: 'idx_notifications_pending',
      });
    }
  },

  async down(queryInterface) {
    const cols = ['error', 'messageId', 'sentAt', 'scheduledFor', 'status', 'body', 'to', 'type', 'channel', 'customerId', 'bookingId'];
    for (const col of cols) {
      try { await queryInterface.removeColumn('Notifications', col); } catch (_) {}
    }
  },
};
