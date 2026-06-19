const env = require('./src/config/env');
const sequelize = require('./src/config/database');
const app = require('./src/app');
const { startScheduler } = require('./src/scheduler');

const start = async () => {
  if (env.isDbConfigured) {
    try {
      await sequelize.authenticate();
      console.log('[db] Connected to SQL Server.');
    } catch (err) {
      console.error(
        '[db] Could not connect to SQL Server. Check DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD in backend/.env.'
      );
      console.error(`[db] ${err.message}`);
      console.error('[db] Server will continue running but DB-dependent routes will fail.');
    }
  }

  app.listen(env.PORT, () => {
    console.log(`[server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[server] API docs available at http://localhost:${env.PORT}/api-docs`);
    startScheduler();
  });
};

start();
