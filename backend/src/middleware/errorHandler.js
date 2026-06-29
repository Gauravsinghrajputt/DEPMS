'use strict';
const logger = require('../utils/logger');

function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Knex / PostgreSQL errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this value already exists.';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid UUID format.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token.'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired.'; }

  // Joi validation errors
  if (err.isJoi) { statusCode = 422; message = err.details[0].message; }

  if (statusCode >= 500) {
    logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { notFound, errorHandler, AppError };
