'use strict';
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { format, startOfMonth, endOfMonth, differenceInBusinessDays } = require('date-fns');

async function getOrCreateTodayEntry(userId, date) {
  const db = getDB();
  const today = date || format(new Date(), 'yyyy-MM-dd');

  let entry = await db('daily_entries').where({ user_id: userId, entry_date: today }).first();

  if (!entry) {
    // Auto-fetch target for this month
    const now = new Date(today);
    const target = await db('targets')
      .where({ user_id: userId, year: now.getFullYear(), month: now.getMonth() + 1 })
      .first();

    const [newEntry] = await db('daily_entries').insert({
      user_id: userId,
      target_id: target?.id || null,
      entry_date: today,
    }).returning('*');
    entry = newEntry;
  }

  return entry;
}

async function getTodayEntry(req, res) {
  const userId = req.params.userId || req.user.id;
  if (req.user.role === 'employee' && userId !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }

  const entry = await getOrCreateTodayEntry(userId);
  const stats = await getDayStats(userId, entry);

  res.json({ success: true, data: { entry, stats } });
}

async function getDayStats(userId, entry) {
  const db = getDB();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Monthly target
  const target = await db('targets').where({ user_id: userId, year, month }).first();

  // Month-to-date completed
  const [{ sum: mtd }] = await db('daily_entries')
    .where('user_id', userId)
    .whereRaw("DATE_TRUNC('month', entry_date) = DATE_TRUNC('month', CURRENT_DATE)")
    .sum('completed_forms as sum');

  const monthlyTarget = target?.monthly_target || 0;
  const dailyTarget = target?.daily_target || 0;
  const totalCompleted = parseInt(mtd) || 0;
  const remaining = Math.max(0, monthlyTarget - totalCompleted);

  // Working days left in month
  const today = new Date();
  const monthEnd = endOfMonth(today);
  const workingDaysLeft = differenceInBusinessDays(monthEnd, today) + 1;
  const requiredDaily = workingDaysLeft > 0 ? Math.ceil(remaining / workingDaysLeft) : 0;

  // Daily progress
  const todayCompleted = entry.completed_forms || 0;
  const dailyProgress = dailyTarget > 0 ? Math.min(100, Math.round((todayCompleted / dailyTarget) * 100)) : 0;

  // Monthly achievement
  const monthlyAchievement = monthlyTarget > 0 ? Math.round((totalCompleted / monthlyTarget) * 100) : 0;

  return {
    daily_target: dailyTarget,
    today_completed: todayCompleted,
    daily_progress_pct: dailyProgress,
    daily_remaining: Math.max(0, dailyTarget - todayCompleted),
    monthly_target: monthlyTarget,
    monthly_completed: totalCompleted,
    monthly_remaining: remaining,
    monthly_achievement_pct: monthlyAchievement,
    required_daily_avg: requiredDaily,
    working_days_left: workingDaysLeft,
  };
}

async function updateFirstHalf(req, res) {
  const { count, half_day_count } = req.body;
  if (typeof count !== 'number' || count < 0) throw new AppError('count must be a non-negative number.', 400);

  const db = getDB();
  const entry = await getOrCreateTodayEntry(req.user.id);

  if (entry.is_submitted) throw new AppError('Entry already submitted. Cannot edit.', 400);

  const updates = {
    first_half_count: count,
    completed_forms: count + (entry.second_half_count || 0),
    updated_at: new Date(),
  };
  if (half_day_count !== undefined) updates.half_day_count = half_day_count;

  await db('daily_entries').where('id', entry.id).update(updates);
  await cacheDel(`dashboard:employee:${req.user.id}`);

  const updated = await db('daily_entries').where('id', entry.id).first();
  const stats = await getDayStats(req.user.id, updated);

  res.json({ success: true, message: 'First half updated.', data: { entry: updated, stats } });
}

async function updateSecondHalf(req, res) {
  const { count } = req.body;
  if (typeof count !== 'number' || count < 0) throw new AppError('count must be a non-negative number.', 400);

  const db = getDB();
  const entry = await getOrCreateTodayEntry(req.user.id);

  if (entry.is_submitted) throw new AppError('Entry already submitted. Cannot edit.', 400);

  const updates = {
    second_half_count: count,
    completed_forms: (entry.first_half_count || 0) + count,
    updated_at: new Date(),
  };

  await db('daily_entries').where('id', entry.id).update(updates);
  await cacheDel(`dashboard:employee:${req.user.id}`);

  const updated = await db('daily_entries').where('id', entry.id).first();
  const stats = await getDayStats(req.user.id, updated);

  res.json({ success: true, message: 'Second half updated.', data: { entry: updated, stats } });
}

async function submitEndOfDay(req, res) {
  const { notes } = req.body;
  const db = getDB();
  const entry = await getOrCreateTodayEntry(req.user.id);

  if (entry.is_submitted) throw new AppError('Entry already submitted for today.', 400);

  const now = new Date();
  await db('daily_entries').where('id', entry.id).update({
    is_submitted: true,
    submitted_at: format(now, 'HH:mm:ss'),
    notes: notes || null,
    updated_at: now,
  });

  // Upsert attendance
  await db('attendance').insert({
    user_id: req.user.id,
    attendance_date: format(now, 'yyyy-MM-dd'),
    status: entry.half_day_count > 0 ? 'half_day' : 'present',
    check_out: format(now, 'HH:mm:ss'),
  }).onConflict(['user_id', 'attendance_date']).merge(['status', 'check_out']);

  await cacheDel(`dashboard:employee:${req.user.id}`);
  await cacheDel(`dashboard:team:${req.user.team_id}`);

  // Check for target achievement notification
  const stats = await getDayStats(req.user.id, entry);
  if (stats.monthly_achievement_pct >= 100) {
    await db('notifications').insert({
      user_id: req.user.id,
      type: 'target_achieved',
      title: '🎯 Monthly Target Achieved!',
      message: `Congratulations! You've reached your monthly target of ${stats.monthly_target} records.`,
    });
  } else if (stats.daily_progress_pct < 50) {
    await db('notifications').insert({
      user_id: req.user.id,
      type: 'low_performance',
      title: 'Performance Alert',
      message: `Today's completion is ${stats.daily_progress_pct}%. Your daily target is ${stats.daily_target}.`,
    });
  }

  res.json({ success: true, message: 'Day submitted successfully.', data: { stats } });
}

async function getEntryHistory(req, res) {
  const userId = req.params.userId || req.user.id;
  if (req.user.role === 'employee' && userId !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }

  const { from, to, page = 1, limit = 30 } = req.query;
  const db = getDB();
  const offset = (page - 1) * limit;

  let query = db('daily_entries').where('user_id', userId).orderBy('entry_date', 'desc');
  if (from) query = query.where('entry_date', '>=', from);
  if (to) query = query.where('entry_date', '<=', to);

  const entries = await query.limit(limit).offset(offset);
  res.json({ success: true, data: entries });
}

module.exports = { getTodayEntry, updateFirstHalf, updateSecondHalf, submitEndOfDay, getEntryHistory };
