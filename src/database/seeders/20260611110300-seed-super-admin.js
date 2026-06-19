const crypto = require('crypto');
const env = require('../../config/env');
const { hashPassword } = require('../../utils/password');

module.exports = {
  up: async (queryInterface) => {
    const existing = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE email = :email',
      { replacements: { email: env.SUPER_ADMIN_EMAIL }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length) {
      return;
    }

    const [role] = await queryInterface.sequelize.query(
      "SELECT id FROM Roles WHERE name = 'super_admin'",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!role) {
      throw new Error('super_admin role not found — run the seed-roles seeder first.');
    }

    const now = new Date();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);

    await queryInterface.bulkInsert('Users', [
      {
        id: userId,
        tenantId: null,
        email: env.SUPER_ADMIN_EMAIL,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.bulkInsert('UserRoles', [
      {
        id: crypto.randomUUID(),
        userId,
        roleId: role.id,
        tenantId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

  },

  down: async (queryInterface) => {
    const [user] = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE email = :email',
      { replacements: { email: env.SUPER_ADMIN_EMAIL }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (user) {
      await queryInterface.bulkDelete('UserRoles', { userId: user.id });
      await queryInterface.bulkDelete('Users', { id: user.id });
    }
  },
};
