'use strict';
const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');

router.use(authenticate, auditMiddleware);

router.get('/', authorize('admin', 'team_leader'), c.listUsers);
router.post('/', authorize('admin'), c.createUser);
router.get('/:id', authorize('admin', 'team_leader'), c.getUser);
router.put('/:id', authorize('admin'), c.updateUser);
router.delete('/:id', authorize('admin'), c.deleteUser);
router.post('/:id/reset-password', authorize('admin'), c.resetPassword);

module.exports = router;
