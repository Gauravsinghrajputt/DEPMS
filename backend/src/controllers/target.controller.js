'use strict';
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { cacheDelPattern } = require('../config/redis');
const { getDaysInMonth, getDay } = require('date-fns');

// Calculate working days in a month (Mon-Sat, excludes Sunday)
function calcWorkingDays(year, month) {
  const days = getDaysInMonth(new Date(year, month - 1));
  let working = 0;
  for (let d = 1; d <= days; d++) {
    const dow = getDay(new Date(year, month - 1, d));
    if (dow !== 0) working++; // 0 = Sunday
  }
  return working;
}

async function listTargets(req, res) {
  const { year, month, user_id, team_id } = req.query;
  const db = getDB();

  let query = db('targets')
    .join('users', 'targets.user_id', 'users.id')
    .leftJoin('teams', 'targets.team_id', 'teams.id')
    .select(
      'targets.*',
      'users.full_name', 'users.employee_code',
      'teams.name as team_name'
    )
    .orderBy(['targets.year', 'targets.month']);

  if (year) query = query.where('targets.year', year);
  if (month) query = query.where('targets.month', month);
  if (user_id) query = query.where('targets.user_id', user_id);
  if (team_id) query = query.where('targets.team_id', team_id);

  // Employees only see their own targets
  if (req.user.role === 'employee') {
    query = query.where('targets.user_id', req.user.id);
  }
  // Team leaders only see their team
  if (req.user.role === 'team_leader') {
    query = query.where('targets.team_id', req.user.team_id);
  }

  const targets = await query;
  res.json({ success: true, data: targets });
}

async function getTarget(req, res) {
  const db = getDB();
  const target = await db('targets').where('id', req.params.id).first();
  if (!target) throw new AppError('Target not found.', 404);

  // Access control
  if (req.user.role === 'employee' && target.user_id !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }

  res.json({ success: true, data: target });
}

async function createTarget(req, res) {
  const { user_id, team_id, year, month, monthly_target, working_days } = req.body;
  const db = getDB();

  const wd = working_days || calcWorkingDays(year, month);
  const daily_target = Math.ceil(monthly_target / wd);

  const existing = await db('targets').where({ user_id, year, month }).first();
  if (existing) throw new AppError('Target already exists for this user/month. Use update instead.', 409);

  const [target] = await db('targets').insert({
    user_id,
    team_id: team_id || null,
    year,
    month,
    monthly_target,
    daily_target,
    working_days: wd,
  }).returning('*');

  await res.locals.auditLog('CREATE', 'target', target.id, null, target);
  await cacheDelPattern('dashboard:*');

  res.status(201).json({ success: true, message: 'Target created.', data: target });
}

async function updateTarget(req, res) {
  const { monthly_target, working_days } = req.body;
  const db = getDB();

  const existing = await db('targets').where('id', req.params.id).first();
  if (!existing) throw new AppError('Target not found.', 404);

  const wd = working_days || existing.working_days;
  const daily_target = monthly_target
    ? Math.ceil(monthly_target / wd)
    : existing.daily_target;

  const updates = {
    ...(monthly_target && { monthly_target }),
    daily_target,
    working_days: wd,
    updated_at: new Date(),
  };

  await db('targets').where('id', req.params.id).update(updates);
  await res.locals.auditLog('UPDATE', 'target', req.params.id, existing, updates);
  await cacheDelPattern('dashboard:*');

  res.json({ success: true, message: 'Target updated.' });
}

// Bulk-create targets for all employees in a team
async function bulkCreateTeamTargets(req, res) {
  const { team_id, year, month, monthly_target, working_days } = req.body;
  const db = getDB();

  const members = await db('users').where({ team_id, is_active: true });
  if (!members.length) throw new AppError('No active members in team.', 404);

  const wd = working_days || calcWorkingDays(year, month);
  const daily_target = Math.ceil(monthly_target / wd);

  const rows = members.map((m) => ({
    user_id: m.id,
    team_id,
    year,
    month,
    monthly_target,
    daily_target,
    working_days: wd,
  }));

  // Upsert — skip existing
  await db('targets').insert(rows).onConflict(['user_id', 'year', 'month']).ignore();
  await cacheDelPattern('dashboard:*');

  res.status(201).json({
    success: true,
    message: `Targets set for ${members.length} employees.`,
  });
}

// Remaining target calculation for a user
async function getTargetProgress(req, res) {
  const userId = req.params.userId || req.user.id;
  const { year, month } = req.query;

  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const db = getDB();

  const target = await db('targets').where({ user_id: userId, year: y, month: m }).first();
  if (!target) throw new AppError('No target found for this period.', 404);

  const [{ sum }] = await db('daily_entries')
    .where('user_id', userId)
    .whereRaw('EXTRACT(YEAR FROM entry_date) = ?', [y])
    .whereRaw('EXTRACT(MONTH FROM entry_date) = ?', [m])
    .sum('completed_forms as sum');

  const completed = parseInt(sum) || 0;
  const remaining = Math.max(0, target.monthly_target - completed);
  const achievement_pct = target.monthly_target > 0
    ? Math.round((completed / target.monthly_target) * 100)
    : 0;

  const today = new Date();
  const monthEnd = new Date(y, m, 0);
  const daysLeft = Math.max(1, Math.ceil((monthEnd - today) / (1000 * 60 * 60 * 24)));
  const required_daily = Math.ceil(remaining / daysLeft);

  res.json({
    success: true,
    data: {
      target,
      completed,
      remaining,
      achievement_pct,
      required_daily_avg: required_daily,
      days_left: daysLeft,
    },
  });
}

module.exports = { listTargets, getTarget, createTarget, updateTarget, bulkCreateTeamTargets, getTargetProgress };
