'use strict';
const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { getDB } = require('../config/database');
const { cacheGet } = require('../config/redis');

async function authenticate(req, res, next) {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) throw new AppError('Authentication required.', 401);

  // Check if token is blacklisted (logout)
  const blacklisted = await cacheGet(`blacklist:${token}`);
  if (blacklisted) throw new AppError('Token has been revoked.', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const db = getDB();
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .where('users.id', decoded.sub)
    .where('users.is_active', true)
    .select(
      'users.id',
      'users.full_name',
      'users.email',
      'users.employee_code',
      'users.team_id',
      'roles.name as role',
      'roles.permissions'
    )
    .first();

  if (!user) throw new AppError('User not found or inactive.', 401);

  req.user = user;
  next();
}

// Role-based access control factory
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403);
    }
    next();
  };
}

// Self-or-admin: employee can only access their own data
function selfOrAdmin(paramField = 'userId') {
  return (req, res, next) => {
    const targetId = req.params[paramField] || req.query[paramField];
    const isAdmin = req.user.role === 'admin';
    const isLeader = req.user.role === 'team_leader';
    const isSelf = req.user.id === targetId;

    if (!isAdmin && !isLeader && !isSelf) {
      throw new AppError('You can only access your own data.', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize, selfOrAdmin };
