module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('RefreshTokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      tokenHash: { type: Sequelize.STRING(255), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdByIp: Sequelize.STRING(45),
      userAgent: Sequelize.STRING(255),
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('RefreshTokens', ['userId'], { name: 'idx_refresh_tokens_user' });
    await queryInterface.addIndex('RefreshTokens', ['tokenHash'], { name: 'idx_refresh_tokens_hash' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('RefreshTokens');
  },
};
