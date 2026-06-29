'use strict';
const router = require('express').Router();
const c = require('../controllers/entry.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(authenticate, auditMiddleware);

// Employee: own entry
router.get('/today', c.getTodayEntry);
router.patch('/first-half', authorize('employee'), c.updateFirstHalf);
router.patch('/second-half', authorize('employee'), c.updateSecondHalf);
router.post('/submit', authorize('employee'), c.submitEndOfDay);

// History — employee sees own, leader/admin see via userId param
router.get('/history', c.getEntryHistory);
router.get('/history/:userId', authorize('admin', 'team_leader'), c.getEntryHistory);
router.get('/today/:userId', authorize('admin', 'team_leader'), c.getTodayEntry);

module.exports = router;
