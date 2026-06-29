'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getDB } = require('../config/database');

router.use(authenticate, authorize('admin'));

router.get('/', async (req, res) => {
  const db = getDB();
  const { page = 1, limit = 50, action, user_id, from, to } = req.query;
  const offset = (page - 1) * limit;

  let query = db('audit_logs')
    .leftJoin('users', 'audit_logs.user_id', 'users.id')
    .select('audit_logs.*', 'users.full_name', 'users.employee_code')
    .orderBy('audit_logs.created_at', 'desc');

  if (action) query = query.where('audit_logs.action', action);
  if (user_id) query = query.where('audit_logs.user_id', user_id);
  if (from) query = query.where('audit_logs.created_at', '>=', from);
  if (to) query = query.where('audit_logs.created_at', '<=', to);

  const [{ count }] = await db('audit_logs').count('id as count');
  const logs = await query.limit(parseInt(limit)).offset(offset);

  res.json({
    success: true,
    data: logs,
    pagination: { page: +page, limit: +limit, total: +count, pages: Math.ceil(count / limit) },
  });
});

module.exports = router;
