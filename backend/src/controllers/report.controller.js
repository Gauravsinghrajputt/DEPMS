'use strict';
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// ── Helper: fetch report data ───────────────────────────
async function fetchReportData({ userId, teamId, year, month, from, to, role, currentUser }) {
  const db = getDB();

  let query = db('daily_entries as e')
    .join('users as u', 'e.user_id', 'u.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('targets as tg', function () {
      this.on('tg.user_id', 'u.id')
        .andOnVal('tg.year', year)
        .andOnVal('tg.month', month);
    })
    .select(
      'e.entry_date', 'e.completed_forms', 'e.first_half_count',
      'e.second_half_count', 'e.is_submitted', 'e.notes',
      'u.id as user_id', 'u.full_name', 'u.employee_code',
      't.name as team_name',
      'tg.daily_target', 'tg.monthly_target'
    )
    .orderBy(['u.full_name', 'e.entry_date']);

  if (userId) query = query.where('e.user_id', userId);
  if (teamId) query = query.where('u.team_id', teamId);
  if (from) query = query.where('e.entry_date', '>=', from);
  if (to) query = query.where('e.entry_date', '<=', to);

  // Access control
  if (currentUser.role === 'employee') query = query.where('e.user_id', currentUser.id);
  if (currentUser.role === 'team_leader') query = query.where('u.team_id', currentUser.team_id);

  return query;
}

// ── Daily Report ────────────────────────────────────────
async function dailyReport(req, res) {
  const { date, team_id, user_id } = req.query;
  const reportDate = date || format(new Date(), 'yyyy-MM-dd');
  const db = getDB();

  let query = db('daily_entries as e')
    .join('users as u', 'e.user_id', 'u.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('targets as tg', function () {
      this.on('tg.user_id', 'u.id')
        .andOnRaw('tg.year = EXTRACT(YEAR FROM e.entry_date)::int')
        .andOnRaw('tg.month = EXTRACT(MONTH FROM e.entry_date)::int');
    })
    .where('e.entry_date', reportDate)
    .select(
      'u.full_name', 'u.employee_code', 't.name as team_name',
      'e.completed_forms', 'e.first_half_count', 'e.second_half_count',
      'e.is_submitted', 'e.submitted_at', 'tg.daily_target'
    )
    .orderBy('u.full_name');

  if (team_id) query = query.where('u.team_id', team_id);
  if (user_id) query = query.where('e.user_id', user_id);
  if (req.user.role === 'team_leader') query = query.where('u.team_id', req.user.team_id);
  if (req.user.role === 'employee') query = query.where('e.user_id', req.user.id);

  const rows = await query;

  res.json({ success: true, data: { date: reportDate, rows, total: rows.length } });
}

// ── Monthly Report ──────────────────────────────────────
async function monthlyReport(req, res) {
  const { year, month, user_id, team_id } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const db = getDB();

  let query = db('daily_entries as e')
    .join('users as u', 'e.user_id', 'u.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('targets as tg', function () {
      this.on('tg.user_id', 'u.id')
        .andOnVal('tg.year', y).andOnVal('tg.month', m);
    })
    .whereRaw('EXTRACT(YEAR FROM e.entry_date) = ?', [y])
    .whereRaw('EXTRACT(MONTH FROM e.entry_date) = ?', [m])
    .groupBy('u.id', 'u.full_name', 'u.employee_code', 't.name', 'tg.monthly_target', 'tg.daily_target')
    .sum('e.completed_forms as total_completed')
    .count('e.id as days_worked')
    .select(
      'u.id as user_id', 'u.full_name', 'u.employee_code',
      't.name as team_name', 'tg.monthly_target', 'tg.daily_target'
    )
    .orderBy('total_completed', 'desc');

  if (user_id) query = query.where('e.user_id', user_id);
  if (team_id) query = query.where('u.team_id', team_id);
  if (req.user.role === 'team_leader') query = query.where('u.team_id', req.user.team_id);
  if (req.user.role === 'employee') query = query.where('e.user_id', req.user.id);

  const rows = await query;

  const enriched = rows.map((r) => ({
    ...r,
    total_completed: parseInt(r.total_completed),
    days_worked: parseInt(r.days_worked),
    achievement_pct: r.monthly_target > 0
      ? Math.round((parseInt(r.total_completed) / r.monthly_target) * 100)
      : 0,
  }));

  res.json({ success: true, data: { year: y, month: m, rows: enriched } });
}

// ── Export to Excel ─────────────────────────────────────
async function exportExcel(req, res) {
  const { type = 'monthly', year, month, team_id } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const db = getDB();

  let rows = await db('daily_entries as e')
    .join('users as u', 'e.user_id', 'u.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('targets as tg', function () {
      this.on('tg.user_id', 'u.id').andOnVal('tg.year', y).andOnVal('tg.month', m);
    })
    .whereRaw('EXTRACT(YEAR FROM e.entry_date) = ?', [y])
    .whereRaw('EXTRACT(MONTH FROM e.entry_date) = ?', [m])
    .modify((q) => {
      if (team_id) q.where('u.team_id', team_id);
      if (req.user.role === 'team_leader') q.where('u.team_id', req.user.team_id);
    })
    .select(
      'e.entry_date', 'u.full_name', 'u.employee_code', 't.name as team_name',
      'e.completed_forms', 'e.first_half_count', 'e.second_half_count',
      'e.is_submitted', 'tg.daily_target', 'tg.monthly_target'
    )
    .orderBy(['u.full_name', 'e.entry_date']);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DEPMS';
  wb.created = new Date();

  const ws = wb.addWorksheet('Performance Report', {
    pageSetup: { fitToPage: true, orientation: 'landscape' },
  });

  // Header styling
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };

  ws.columns = [
    { header: 'Date', key: 'entry_date', width: 14 },
    { header: 'Employee Code', key: 'employee_code', width: 16 },
    { header: 'Name', key: 'full_name', width: 22 },
    { header: 'Team', key: 'team_name', width: 18 },
    { header: 'First Half', key: 'first_half_count', width: 12 },
    { header: 'Second Half', key: 'second_half_count', width: 13 },
    { header: 'Total Completed', key: 'completed_forms', width: 16 },
    { header: 'Daily Target', key: 'daily_target', width: 13 },
    { header: 'Achievement %', key: 'achievement_pct', width: 15 },
    { header: 'Submitted', key: 'is_submitted', width: 12 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });

  rows.forEach((row, i) => {
    const pct = row.daily_target > 0
      ? Math.round((row.completed_forms / row.daily_target) * 100)
      : 0;

    const wsRow = ws.addRow({
      ...row,
      entry_date: format(new Date(row.entry_date), 'dd/MM/yyyy'),
      achievement_pct: `${pct}%`,
      is_submitted: row.is_submitted ? 'Yes' : 'No',
    });

    // Color code by performance
    const pctCell = wsRow.getCell('achievement_pct');
    if (pct >= 100) pctCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    else if (pct >= 75) pctCell.font = { color: { argb: 'FFD97706' } };
    else if (pct < 50) pctCell.font = { color: { argb: 'FFDC2626' } };

    if (i % 2 === 0) {
      wsRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  // Summary row
  const lastRow = ws.addRow({
    full_name: 'TOTAL',
    completed_forms: rows.reduce((s, r) => s + r.completed_forms, 0),
  });
  lastRow.font = { bold: true };
  lastRow.getCell('full_name').fill = headerFill;
  lastRow.getCell('full_name').font = { ...headerFont };

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: 'J1' };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=report_${y}_${m}.xlsx`);

  await res.locals.auditLog('EXPORT', 'report', null, null, { type: 'excel', year: y, month: m });

  await wb.xlsx.write(res);
  res.end();
}

// ── Export to PDF ───────────────────────────────────────
async function exportPDF(req, res) {
  const { year, month, team_id } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const db = getDB();

  const rows = await db('daily_entries as e')
    .join('users as u', 'e.user_id', 'u.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('targets as tg', function () {
      this.on('tg.user_id', 'u.id').andOnVal('tg.year', y).andOnVal('tg.month', m);
    })
    .whereRaw('EXTRACT(YEAR FROM e.entry_date) = ?', [y])
    .whereRaw('EXTRACT(MONTH FROM e.entry_date) = ?', [m])
    .modify((q) => {
      if (team_id) q.where('u.team_id', team_id);
      if (req.user.role === 'team_leader') q.where('u.team_id', req.user.team_id);
    })
    .groupBy('u.id', 'u.full_name', 'u.employee_code', 't.name', 'tg.monthly_target')
    .sum('e.completed_forms as total')
    .select('u.full_name', 'u.employee_code', 't.name as team_name', 'tg.monthly_target')
    .orderBy('total', 'desc');

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report_${y}_${m}.pdf`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).fillColor('#1e3a5f').text('DEPMS - Monthly Performance Report', { align: 'center' });
  doc.fontSize(12).fillColor('#555').text(`${format(new Date(y, m - 1), 'MMMM yyyy')}`, { align: 'center' });
  doc.moveDown(1);

  // Table header
  const colX = [40, 120, 260, 380, 480, 580];
  const headers = ['Rank', 'Emp Code', 'Name', 'Team', 'Completed', 'Target %'];
  doc.fontSize(10).fillColor('#ffffff');
  doc.rect(40, doc.y, 760, 20).fill('#1e3a5f');
  headers.forEach((h, i) => doc.fillColor('#ffffff').text(h, colX[i], doc.y - 16, { width: 100 }));
  doc.moveDown(0.2);

  // Rows
  rows.forEach((r, i) => {
    const pct = r.monthly_target > 0 ? Math.round((parseInt(r.total) / r.monthly_target) * 100) : 0;
    const y2 = doc.y;
    if (i % 2 === 0) doc.rect(40, y2, 760, 18).fill('#f8fafc');
    doc.fillColor('#333').fontSize(9);
    doc.text(String(i + 1), colX[0], y2 + 4, { width: 60 });
    doc.text(r.employee_code, colX[1], y2 + 4, { width: 120 });
    doc.text(r.full_name, colX[2], y2 + 4, { width: 110 });
    doc.text(r.team_name || '-', colX[3], y2 + 4, { width: 90 });
    doc.text(String(parseInt(r.total)), colX[4], y2 + 4, { width: 80 });
    doc.fillColor(pct >= 100 ? '#16a34a' : pct < 50 ? '#dc2626' : '#d97706')
      .text(`${pct}%`, colX[5], y2 + 4, { width: 80 });
    doc.moveDown(0.1);
  });

  doc.moveDown(2).fontSize(8).fillColor('#999')
    .text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} by DEPMS`, { align: 'center' });

  await res.locals.auditLog('EXPORT', 'report', null, null, { type: 'pdf', year: y, month: m });

  doc.end();
}

module.exports = { dailyReport, monthlyReport, exportExcel, exportPDF };
