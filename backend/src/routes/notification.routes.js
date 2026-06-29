'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getDB } = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res) => {
  const db = getDB();
  const notifications = await db('notifications')
    .where('user_id', req.user.id)
    .orderBy('created_at', 'desc')
    .limit(50);
  res.json({ success: true, data: notifications });
});

router.patch('/:id/read', async (req, res) => {
  const db = getDB();
  await db('notifications')
    .where({ id: req.params.id, user_id: req.user.id })
    .update({ is_read: true });
  res.json({ success: true });
});

router.patch('/read-all', async (req, res) => {
  const db = getDB();
  await db('notifications')
    .where({ user_id: req.user.id, is_read: false })
    .update({ is_read: true });
  res.json({ success: true });
});

module.exports = router;
