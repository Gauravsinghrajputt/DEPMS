'use strict';
const bcrypt = require('bcryptjs');
const { getDB } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { cacheDelPattern } = require('../config/redis');

const USER_FIELDS = [
  'users.id', 'users.employee_code', 'users.full_name', 'users.email',
  'users.team_id', 'users.is_active', 'users.last_login', 'users.created_at',
  'roles.name as role', 'teams.name as team_name',
];

async function listUsers(req, res) {
  const { page = 1, limit = 20, role, team_id, is_active, search } = req.query;
  const offset = (page - 1) * limit;
  const db = getDB();

  let query = db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('teams', 'users.team_id', 'teams.id')
    .select(USER_FIELDS)
    .orderBy('users.created_at', 'desc');

  if (role) query = query.where('roles.name', role);
  if (team_id) query = query.where('users.team_id', team_id);
  if (is_active !== undefined) query = query.where('users.is_active', is_active === 'true');
  if (search) query = query.whereILike('users.full_name', `%${search}%`)
    .orWhereILike('users.employee_code', `%${search}%`);

  // Team leaders only see their own team
  if (req.user.role === 'team_leader') {
    query = query.where('users.team_id', req.user.team_id);
  }

  const [{ count }] = await db('users').count('id as count');
  const users = await query.limit(limit).offset(offset);

  res.json({
    success: true,
    data: users,
    pagination: { page: +page, limit: +limit, total: +count, pages: Math.ceil(count / limit) },
  });
}

async function getUser(req, res) {
  const db = getDB();
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .leftJoin('teams', 'users.team_id', 'teams.id')
    .where('users.id', req.params.id)
    .select(USER_FIELDS)
    .first();

  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
}

async function createUser(req, res) {
  const { employee_code, full_name, email, password, role, team_id } = req.body;
  const db = getDB();

  const roleRow = await db('roles').where('name', role || 'employee').first();
  if (!roleRow) throw new AppError('Invalid role.', 400);

  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

  const [user] = await db('users').insert({
    role_id: roleRow.id,
    team_id: team_id || null,
    employee_code: employee_code.toUpperCase(),
    full_name,
    email: email.toLowerCase(),
    password_hash: hash,
  }).returning(['id', 'employee_code', 'full_name', 'email', 'created_at']);

  await res.locals.auditLog('CREATE', 'user', user.id, null, { employee_code, full_name, email, role });
  await cacheDelPattern('dashboard:*');

  res.status(201).json({ success: true, message: 'User created successfully.', data: user });
}

async function updateUser(req, res) {
  const { full_name, email, team_id, is_active, role } = req.body;
  const db = getDB();

  const existing = await db('users').where('id', req.params.id).first();
  if (!existing) throw new AppError('User not found.', 404);

  const updates = { updated_at: new Date() };
  if (full_name) updates.full_name = full_name;
  if (email) updates.email = email.toLowerCase();
  if (team_id !== undefined) updates.team_id = team_id;
  if (is_active !== undefined) updates.is_active = is_active;
  if (role) {
    const roleRow = await db('roles').where('name', role).first();
    if (!roleRow) throw new AppError('Invalid role.', 400);
    updates.role_id = roleRow.id;
  }

  await db('users').where('id', req.params.id).update(updates);
  await res.locals.auditLog('UPDATE', 'user', req.params.id, existing, updates);

  res.json({ success: true, message: 'User updated successfully.' });
}

async function deleteUser(req, res) {
  const db = getDB();
  const user = await db('users').where('id', req.params.id).first();
  if (!user) throw new AppError('User not found.', 404);

  // Soft delete
  await db('users').where('id', req.params.id).update({ is_active: false, updated_at: new Date() });
  await res.locals.auditLog('DELETE', 'user', req.params.id, user, null);

  res.json({ success: true, message: 'User deactivated.' });
}

async function resetPassword(req, res) {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);

  const db = getDB();
  const hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  await db('users').where('id', req.params.id).update({ password_hash: hash, updated_at: new Date() });
  await res.locals.auditLog('RESET_PASSWORD', 'user', req.params.id);

  res.json({ success: true, message: 'Password reset successfully.' });
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, resetPassword };
