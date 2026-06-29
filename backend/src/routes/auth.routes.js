// ════════════════════════════════════════════
// routes/auth.routes.js
// ════════════════════════════════════════════
'use strict';
const router = require('express').Router();
const { login, logout, refresh, getMe, changePassword, authLimiter } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(auditMiddleware);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
