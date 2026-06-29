'use strict';
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware factory: attaches auditLog() helper to res.locals
 * Call res.locals.auditLog(action, entityType, entityId, oldVal, newVal) in controllers
 */
function auditMiddleware(req, res, next) {
  res.locals.auditLog = async (action, entityType, entityId, oldValue = null, newValue = null) => {
    if (!req.user) return;
    try {
      await getDB()('audit_logs').insert({
        user_id: req.user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: req.ip || req.connection?.remoteAddress,
        created_at: new Date(),
      });
    } catch (err) {
      logger.error('Audit log failed:', err.message);
    }
  };
  next();
}

module.exports = { auditMiddleware };
