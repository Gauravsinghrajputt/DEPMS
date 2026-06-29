'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditMiddleware } = require('../middleware/audit.middleware');
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

router.use(authenticate, auditMiddleware);

// List all teams
router.get('/', authorize('admin', 'team_leader'), async (req, res) => {
  const db = getDB();
  const teams = await db('teams')
    .leftJoin('users as leader', 'teams.leader_id', 'leader.id')
    .select('teams.*', 'leader.full_name as leader_name', 'leader.employee_code as leader_code')
    .where('teams.is_active', true)
    .orderBy('teams.name');

  // Attach member count
  const counts = await db('users').where('is_active', true).groupBy('team_id')
    .count('id as cnt').select('team_id');
  const countMap = Object.fromEntries(counts.map((c) => [c.team_id, parseInt(c.cnt)]));

  res.json({ success: true, data: teams.map((t) => ({ ...t, member_count: countMap[t.id] || 0 })) });
});

// Get single team with members
router.get('/:id', authorize('admin', 'team_leader'), async (req, res) => {
  const db = getDB();
  const team = await db('teams').where('id', req.params.id).first();
  if (!team) throw new AppError('Team not found.', 404);

  const members = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where({ 'users.team_id': req.params.id, 'users.is_active': true })
    .select('users.id', 'users.full_name', 'users.employee_code', 'users.email', 'roles.name as role');

  res.json({ success: true, data: { ...team, members } });
});

// Create team
router.post('/', authorize('admin'), async (req, res) => {
  const { name, description, leader_id } = req.body;
  if (!name) throw new AppError('Team name is required.', 400);
  const db = getDB();
  const [team] = await db('teams').insert({ name, description, leader_id: leader_id || null }).returning('*');
  await res.locals.auditLog('CREATE', 'team', team.id, null, team);
  res.status(201).json({ success: true, data: team });
});

// Update team
router.put('/:id', authorize('admin'), async (req, res) => {
  const { name, description, leader_id, is_active } = req.body;
  const db = getDB();
  const existing = await db('teams').where('id', req.params.id).first();
  if (!existing) throw new AppError('Team not found.', 404);

  const updates = { updated_at: new Date() };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (leader_id !== undefined) updates.leader_id = leader_id;
  if (is_active !== undefined) updates.is_active = is_active;

  await db('teams').where('id', req.params.id).update(updates);
  await res.locals.auditLog('UPDATE', 'team', req.params.id, existing, updates);
  res.json({ success: true, message: 'Team updated.' });
});

// Assign employee to team
router.post('/:id/assign', authorize('admin'), async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) throw new AppError('user_id is required.', 400);
  const db = getDB();
  await db('users').where('id', user_id).update({ team_id: req.params.id, updated_at: new Date() });
  await res.locals.auditLog('ASSIGN_TEAM', 'user', user_id, null, { team_id: req.params.id });
  res.json({ success: true, message: 'Employee assigned to team.' });
});

module.exports = router;
