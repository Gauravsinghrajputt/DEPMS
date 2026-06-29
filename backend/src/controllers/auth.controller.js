'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDB } = require('../config/database');
const { cacheSet } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

function generateTokens(userId, role) {
  const access = jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  const refresh = jwt.sign(
    { sub: userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { access, refresh };
}

function setCookies(res, tokens) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', tokens.access, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
  res.cookie('refresh_token', tokens.refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth/refresh',
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required.', 400);

  const db = getDB();
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('users.email', email.toLowerCase().trim())
    .select('users.*', 'roles.name as role')
    .first();

  if (!user || !user.is_active) throw new AppError('Invalid credentials.', 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Invalid credentials.', 401);

  // Update last login
  await db('users').where('id', user.id).update({ last_login: new Date() });

  const tokens = generateTokens(user.id, user.role);
  setCookies(res, tokens);

  // Audit
  await res.locals.auditLog?.('LOGIN', 'user', user.id);

  logger.info(`Login: ${user.email} [${user.role}]`);

  res.json({ token: tokens.access,
    success: true,
    message: 'Login successful.',
    data: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      employee_code: user.employee_code,
      role: user.role,
      team_id: user.team_id,
    },
  });
}

async function logout(req, res) {
  const token = req.cookies?.access_token;
  if (token) {
    // Blacklist token until it expires (~8h TTL)
    await cacheSet(`blacklist:${token}`, 1, 8 * 60 * 60);
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ success: true, message: 'Logged out successfully.' });
}

async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) throw new AppError('Refresh token required.', 401);

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  if (decoded.type !== 'refresh') throw new AppError('Invalid token type.', 401);

  const db = getDB();
  const user = await db('users').join('roles', 'users.role_id', 'roles.id')
    .where('users.id', decoded.sub).where('users.is_active', true)
    .select('users.id', 'roles.name as role').first();

  if (!user) throw new AppError('User not found.', 401);

  const tokens = generateTokens(user.id, user.role);
  setCookies(res, tokens);

  res.json({ success: true, message: 'Token refreshed.' });
}

async function getMe(req, res) {
  res.json({ success: true, data: req.user });
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) throw new AppError('Both passwords are required.', 400);
  if (new_password.length < 8) throw new AppError('New password must be at least 8 characters.', 400);

  const db = getDB();
  const user = await db('users').where('id', req.user.id).first();
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect.', 401);

  const hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  await db('users').where('id', req.user.id).update({ password_hash: hash, updated_at: new Date() });

  res.json({ success: true, message: 'Password changed successfully.' });
}

module.exports = { login, logout, refresh, getMe, changePassword, authLimiter };
