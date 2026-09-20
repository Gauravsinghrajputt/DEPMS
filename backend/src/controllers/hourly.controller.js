'use strict';
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const HOUR_SLOTS = [
  { slot: 9,  label: '9-10 AM' },
  { slot: 10, label: '10-11 AM' },
  { slot: 11, label: '11-12 PM' },
  { slot: 12, label: '12-1 PM' },
  { slot: 13, label: '1-2 PM' },
  { slot: 14, label: '2-3 PM' },
  { slot: 15, label: '3-4 PM' },
  { slot: 16, label: '4-5 PM' },
  { slot: 17, label: '5-6 PM' },
  { slot: 18, label: '6-7 PM' },
  { slot: 19, label: '7-8 PM' },
  { slot: 20, label: '8-9 PM' },
];

async function getTodayHourly(req, res) {
  const userId = req.params.userId || req.user.id;
  if (req.user.role === 'employee' && userId !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }

  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  const existing = await db('hourly_entries')
    .where({ user_id: userId, entry_date: today })
    .select('hour_slot', 'count');

  const existingMap = {};
  existing.forEach(e => { existingMap[e.hour_slot] = e.count; });

  const slots = HOUR_SLOTS.map(s => ({
    hour_slot: s.slot,
    slot_label: s.label,
    count: existingMap[s.slot] || 0,
    is_active: s.slot === currentHour,
    is_past: s.slot < currentHour,
    is_future: s.slot > currentHour,
    is_editable: s.slot <= currentHour,
  }));

  const total = existing.reduce((sum, e) => sum + e.count, 0);

  // Get target
  const now = new Date();
  const target = await db('targets').where({
    user_id: userId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }).first();

  const dailyTarget = target?.daily_target || 0;
  const deficit = total - dailyTarget;

  res.json({
    success: true,
    data: {
      slots,
      total_today: total,
      daily_target: dailyTarget,
      deficit,
      date: today,
    },
  });
}

async function updateHourlyEntry(req, res) {
  const { hour_slot, count } = req.body;

  if (typeof count !== 'number' || count < 0) {
    throw new AppError('Count must be a non-negative number.', 400);
  }

  if (!HOUR_SLOTS.find(s => s.slot === hour_slot)) {
    throw new AppError('Invalid hour slot.', 400);
  }

  const currentHour = new Date().getHours();
  if (hour_slot > currentHour) {
    throw new AppError('Cannot enter data for future hours.', 400);
  }

  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const slotLabel = HOUR_SLOTS.find(s => s.slot === hour_slot).label;

  await db('hourly_entries')
    .insert({
      user_id: req.user.id,
      entry_date: today,
      hour_slot,
      slot_label: slotLabel,
      count,
      updated_at: new Date(),
    })
    .onConflict(['user_id', 'entry_date', 'hour_slot'])
    .merge(['count', 'updated_at']);

  // Update daily_entries total
  const totalRow = await db('hourly_entries')
    .where({ user_id: req.user.id, entry_date: today })
    .sum('count as total')
    .first();

  const total = parseInt(totalRow?.total) || 0;

  await db('daily_entries')
    .insert({
      user_id: req.user.id,
      entry_date: today,
      completed_forms: total,
      updated_at: new Date(),
    })
    .onConflict(['user_id', 'entry_date'])
    .merge(['completed_forms', 'updated_at']);

  res.json({
    success: true,
    message: 'Entry saved!',
    data: { hour_slot, count, total_today: total },
  });
}

async function getHourlyByDate(req, res) {
  const { date, userId } = req.query;
  const targetUserId = userId || req.user.id;

  if (req.user.role === 'employee' && targetUserId !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }

  const db = getDB();
  const entries = await db('hourly_entries')
    .where({ user_id: targetUserId, entry_date: date })
    .orderBy('hour_slot')
    .select('hour_slot', 'slot_label', 'count');

  const total = entries.reduce((sum, e) => sum + e.count, 0);

  res.json({ success: true, data: { entries, total, date } });
}

async function getTeamHourlyToday(req, res) {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  let memberQuery = db('users').where('is_active', true);
  if (req.user.role === 'team_leader') {
    memberQuery = memberQuery.where('team_id', req.user.team_id);
  }
  const members = await memberQuery.select('id', 'full_name', 'employee_code');

  const result = await Promise.all(members.map(async (m) => {
    const entries = await db('hourly_entries')
      .where({ user_id: m.id, entry_date: today })
      .orderBy('hour_slot')
      .select('hour_slot', 'slot_label', 'count');

    const target = await db('targets').where({
      user_id: m.id,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    }).first();

    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const dailyTarget = target?.daily_target || 0;

    return {
      ...m,
      entries,
      total_today: total,
      daily_target: dailyTarget,
      deficit: total - dailyTarget,
    };
  }));

  res.json({ success: true, data: result });
}

module.exports = { getTodayHourly, updateHourlyEntry, getHourlyByDate, getTeamHourlyToday };