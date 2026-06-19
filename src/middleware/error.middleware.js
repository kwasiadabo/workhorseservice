const { ZodError } = require('zod');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Centralized error handler — must be the last middleware registered.
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code, errors: err.errors });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(err.name === 'SequelizeUniqueConstraintError' ? 409 : 400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors?.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ success: false, message: 'Related resource not found or in use' });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = errorMiddleware;
