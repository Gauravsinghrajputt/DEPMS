// ── report.routes.js ─────────────────────────────────
'use strict';
const router = require('express').Router();
const c = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(authenticate, auditMiddleware);

router.get('/daily', c.dailyReport);
router.get('/monthly', c.monthlyReport);
router.get('/export/excel', authorize('admin', 'team_leader'), c.exportExcel);
router.get('/export/pdf', authorize('admin', 'team_leader'), c.exportPDF);

module.exports = router;
