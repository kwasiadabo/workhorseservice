const env = require("./src/config/env");
require("./src/config/sentry"); // initializes (or stays inactive) before anything else runs
const sequelize = require("./src/config/database");
const app = require("./src/app");
const { startScheduler } = require("./src/scheduler");

const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async () => {
  if (env.isDbConfigured) {
    try {
      await sequelize.authenticate();
      console.log("[db] Connected to SQL Server.");
    } catch (err) {
      console.error(
        "[db] Could not connect to SQL Server. Check DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD in backend/.env.",
      );
      console.error(`[db] ${err.message}`);
      console.error(
        "[db] Server will continue running but DB-dependent routes will fail.",
      );
    }
  }

  const server = app.listen(env.PORT, () => {
    console.log(
      `[server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    console.log(
      `[server] API docs available at http://localhost:${env.PORT}/api-docs`,
    );
    startScheduler();
  });

  // On a rolling restart/redeploy, the platform sends SIGTERM — without this,
  // in-flight requests (including booking/payment transactions) get hard-killed
  // mid-flight instead of finishing, and the Sequelize pool is never released.
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    const forceExit = setTimeout(() => {
      console.error("[server] Shutdown timed out, forcing exit.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    server.close(async () => {
      clearTimeout(forceExit);
      try {
        await sequelize.close();
        console.log("[db] Connection pool closed.");
      } catch (err) {
        console.error(`[db] Error closing connection pool: ${err.message}`);
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start();
