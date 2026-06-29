'use strict';
const router = require('express').Router();
const c = require('../controllers/target.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(authenticate, auditMiddleware);

router.get('/', c.listTargets);
router.post('/', authorize('admin'), c.createTarget);
router.post('/bulk-team', authorize('admin'), c.bulkCreateTeamTargets);
router.get('/progress/:userId', c.getTargetProgress);
router.get('/:id', c.getTarget);
router.put('/:id', authorize('admin'), c.updateTarget);

module.exports = router;
