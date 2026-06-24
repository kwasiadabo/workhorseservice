const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const sequelize = require('./config/database');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const { verifyPaystackSignature } = require('./middleware/paystackWebhook.middleware');
const subscriptionController = require('./controllers/subscription.controller');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Webhook must receive raw body for HMAC verification — registered before express.json()
app.post(
  '/api/v1/subscription/webhook',
  express.raw({ type: 'application/json' }),
  verifyPaystackSignature,
  subscriptionController.handleWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // No request logging at all existed in production before this — 'combined'
  // gives a standard access-log line (method, path, status, response time,
  // referrer/UA) to stdout, which the hosting platform can capture.
  app.use(morgan('combined'));
}

// Global rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Report endpoints aggregate full date-range datasets in memory (see
// docs/SCALABILITY.md) — cheap enough to leave reachable, but not at the
// same 300-req budget as a plain GET /branches. A tighter, separate limiter
// caps abuse/accidental hammering of these specific routes.
const REPORT_PATHS = [
  '/api/v1/bookings-report',
  '/api/v1/payments-report',
  '/api/v1/revenue-report',
  '/api/v1/service-provider-report',
  '/api/v1/team-performance-report',
  '/api/v1/commission',
  '/api/v1/expense-report',
  '/api/v1/banking-report',
];
app.use(
  REPORT_PATHS,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(`/${env.UPLOAD_DIR}`, express.static(path.resolve(__dirname, '..', env.UPLOAD_DIR)));

app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'VX-Workhorse API Docs' }));

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  if (env.isDbConfigured) {
    try {
      await sequelize.authenticate();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }
  res.json({ status: 'ok', db: dbStatus, env: env.NODE_ENV });
});

app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
