'use strict';
const { getDB } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
async function employeeDashboard(req, res) {
  const userId = req.user.id;
  const cacheKey = 'dashboard:employee:' + userId;
  const db = getDB();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().split('T')[0];
  const todayEntry = await db('daily_entries').where({ user_id: userId, entry_date: today }).first();
  const target = await db('targets').where({ user_id: userId, year, month }).first();
  const mtdRow = await db('daily_entries').where('user_id', userId).whereRaw('EXTRACT(YEAR FROM entry_date) = ?', [year]).whereRaw('EXTRACT(MONTH FROM entry_date) = ?', [month]).sum('completed_forms as sum').first();
  const weekTrend = await db('daily_entries').where('user_id', userId).whereRaw("entry_date >= CURRENT_DATE - INTERVAL '6 days'").orderBy('entry_date', 'asc').select('entry_date', 'completed_forms', 'first_half_count', 'second_half_count');
  const unreadRow = await db('notifications').where({ user_id: userId, is_read: false }).count('id as count').first();
  const monthlyTarget = target ? target.monthly_target : 0;
  const dailyTarget = target ? target.daily_target : 0;
  const totalCompleted = parseInt(mtdRow && mtdRow.sum ? mtdRow.sum : 0) || 0;
  const todayCompleted = todayEntry ? todayEntry.completed_forms : 0;
  const data = { widgets: { monthly_target: monthlyTarget, total_completed: totalCompleted, remaining: Math.max(0, monthlyTarget - totalCompleted), daily_target: dailyTarget, today_completed: todayCompleted, achievement_pct: monthlyTarget > 0 ? Math.round((totalCompleted / monthlyTarget) * 100) : 0, daily_progress_pct: dailyTarget > 0 ? Math.min(100, Math.round((todayCompleted / dailyTarget) * 100)) : 0, productivity_score: calcProductivityScore(totalCompleted, monthlyTarget, todayCompleted, dailyTarget) }, today_entry: todayEntry || null, week_trend: weekTrend, unread_notifications: parseInt(unreadRow && unreadRow.count ? unreadRow.count : 0) || 0 };
  await cacheSet(cacheKey, data, 120);
  res.json({ success: true, data });
}
async function leaderDashboard(req, res) {
  const teamId = req.user.team_id;
  const cacheKey = 'dashboard:team:' + teamId;
  const db = getDB();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().split('T')[0];
  const members = await db('users').where({ team_id: teamId, is_active: true }).whereNot('id', req.user.id).select('id', 'full_name', 'employee_code');
  const memberIds = members.map(function(m) { return m.id; });
  if (memberIds.length === 0) { return res.json({ success: true, data: { team_summary: { total_members: 0, submitted_today: 0, present_today: 0, team_monthly_target: 0, team_monthly_completed: 0, team_achievement_pct: 0 }, members: [], week_trend: [] } }); }
  const todayEntries = await db('daily_entries').whereIn('user_id', memberIds).where('entry_date', today).select('user_id', 'completed_forms', 'is_submitted');
  const targets = await db('targets').whereIn('user_id', memberIds).where({ year, month }).select('user_id', 'monthly_target', 'daily_target');
  const mtdRows = await db('daily_entries').whereIn('user_id', memberIds).whereRaw('EXTRACT(YEAR FROM entry_date) = ?', [year]).whereRaw('EXTRACT(MONTH FROM entry_date) = ?', [month]).groupBy('user_id').select('user_id').sum('completed_forms as total');
  const attendance = await db('attendance').whereIn('user_id', memberIds).where('attendance_date', today).select('user_id', 'status');
  const memberStats = members.map(function(m) {
    const entry = todayEntries.find(function(e) { return e.user_id === m.id; });
    const tgt = targets.find(function(t) { return t.user_id === m.id; });
    const mtd = mtdRows.find(function(r) { return r.user_id === m.id; });
    const att = attendance.find(function(a) { return a.user_id === m.id; });
    const completed = parseInt(mtd && mtd.total ? mtd.total : 0) || 0;
    const mt = tgt ? tgt.monthly_target : 0;
    return { id: m.id, full_name: m.full_name, employee_code: m.employee_code, today_completed: entry ? entry.completed_forms : 0, daily_target: tgt ? tgt.daily_target : 0, monthly_target: mt, monthly_completed: completed, achievement_pct: mt > 0 ? Math.round((completed / mt) * 100) : 0, is_submitted: entry ? entry.is_submitted : false, attendance_status: att ? att.status : 'absent' };
  });
  const weekTrend = await db('daily_entries').whereIn('user_id', memberIds).whereRaw("entry_date >= CURRENT_DATE - INTERVAL '6 days'").groupBy('entry_date').orderBy('entry_date', 'asc').select('entry_date').sum('completed_forms as total');
  const tc = memberStats.reduce(function(s, m) { return s + m.monthly_completed; }, 0);
  const tt = memberStats.reduce(function(s, m) { return s + m.monthly_target; }, 0);
  const data = { team_summary: { total_members: members.length, submitted_today: todayEntries.filter(function(e) { return e.is_submitted; }).length, present_today: attendance.filter(function(a) { return a.status === 'present' || a.status === 'half_day'; }).length, team_monthly_target: tt, team_monthly_completed: tc, team_achievement_pct: tt > 0 ? Math.round((tc / tt) * 100) : 0 }, members: memberStats, week_trend: weekTrend };
  await cacheSet(cacheKey, data, 180);
  res.json({ success: true, data });
}
async function adminDashboard(req, res) {
  const cacheKey = 'dashboard:admin';
  const db = getDB();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().split('T')[0];
  const totalUsersRow = await db('users').where('is_active', true).count('id as count').first();
  const totalTeamsRow = await db('teams').where('is_active', true).count('id as count').first();
  const orgMTDRow = await db('daily_entries').whereRaw('EXTRACT(YEAR FROM entry_date) = ?', [year]).whereRaw('EXTRACT(MONTH FROM entry_date) = ?', [month]).sum('completed_forms as sum').first();
  const orgTargetRow = await db('targets').where({ year, month }).sum('monthly_target as sum').first();
  const submittedRow = await db('daily_entries').where({ entry_date: today, is_submitted: true }).count('id as count').first();
  const teamPerf = await db('teams').join('users', 'teams.id', 'users.team_id').join('daily_entries', 'users.id', 'daily_entries.user_id').where('teams.is_active', true).where('users.is_active', true).whereRaw('EXTRACT(YEAR FROM daily_entries.entry_date) = ?', [year]).whereRaw('EXTRACT(MONTH FROM daily_entries.entry_date) = ?', [month]).groupBy('teams.id', 'teams.name').select('teams.id', 'teams.name').sum('daily_entries.completed_forms as completed');
  const monthlyTrend = await db('daily_entries').whereRaw("entry_date >= CURRENT_DATE - INTERVAL '6 months'").groupByRaw("DATE_TRUNC('month', entry_date)").orderByRaw("DATE_TRUNC('month', entry_date)").select(db.raw("DATE_TRUNC('month', entry_date) as month")).sum('completed_forms as total');
  const leaderboard = await db('daily_entries').join('users', 'daily_entries.user_id', 'users.id').leftJoin('teams', 'users.team_id', 'teams.id').whereRaw('EXTRACT(YEAR FROM daily_entries.entry_date) = ?', [year]).whereRaw('EXTRACT(MONTH FROM daily_entries.entry_date) = ?', [month]).groupBy('users.id', 'users.full_name', 'users.employee_code', 'teams.name').orderBy('total', 'desc').limit(10).select('users.id', 'users.full_name', 'users.employee_code', 'teams.name as team_name').sum('daily_entries.completed_forms as total');
  const data = { widgets: { total_employees: parseInt(totalUsersRow ? totalUsersRow.count : 0) || 0, total_teams: parseInt(totalTeamsRow ? totalTeamsRow.count : 0) || 0, org_monthly_target: parseInt(orgTargetRow && orgTargetRow.sum ? orgTargetRow.sum : 0) || 0, org_monthly_completed: parseInt(orgMTDRow && orgMTDRow.sum ? orgMTDRow.sum : 0) || 0, org_achievement_pct: orgTargetRow && orgTargetRow.sum > 0 ? Math.round((parseInt(orgMTDRow.sum) / parseInt(orgTargetRow.sum)) * 100) : 0, submitted_today: parseInt(submittedRow ? submittedRow.count : 0) || 0 }, team_performance: teamPerf, monthly_trend: monthlyTrend, leaderboard };
  await cacheSet(cacheKey, data, 300);
  res.json({ success: true, data });
}
function calcProductivityScore(mtdCompleted, monthlyTarget, todayCompleted, dailyTarget) {
  if (!monthlyTarget && !dailyTarget) return 0;
  const ms = monthlyTarget > 0 ? (mtdCompleted / monthlyTarget) * 60 : 0;
  const ds = dailyTarget > 0 ? (todayCompleted / dailyTarget) * 40 : 0;
  return Math.min(100, Math.round(ms + ds));
}
module.exports = { employeeDashboard, leaderDashboard, adminDashboard };
