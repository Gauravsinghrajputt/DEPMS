'use strict';
const router = require('express').Router();
const c = require('../controllers/hourly.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(authenticate, auditMiddleware);

router.get('/today', c.getTodayHourly);
router.get('/today/:userId', authorize('admin', 'team_leader'), c.getTodayHourly);
router.post('/update', authorize('employee'), c.updateHourlyEntry);
router.get('/date', c.getHourlyByDate);
router.get('/team/today', authorize('admin', 'team_leader'), c.getTeamHourlyToday);
router.post('/admin-edit', authorize('admin'), c.adminEditHourly);

module.exports = router;