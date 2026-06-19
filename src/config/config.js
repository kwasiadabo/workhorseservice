// Sequelize CLI configuration (used by `sequelize-cli` for migrations/seeders).
// Shares the same env loading/validation as the runtime app (src/config/env.js).
const env = require('./env');

const dialectOptions = {
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
  },
};

const base = {
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
  dialectOptions,
};

module.exports = {
  development: base,
  test: { ...base, database: env.DB_NAME ? `${env.DB_NAME}_test` : undefined },
  production: base,
};
