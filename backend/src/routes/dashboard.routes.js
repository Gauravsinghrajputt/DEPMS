'use strict';
const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/employee', authorize('employee'), c.employeeDashboard);
router.get('/leader', authorize('team_leader'), c.leaderDashboard);
router.get('/admin', authorize('admin'), c.adminDashboard);

module.exports = router;
