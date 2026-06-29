'use strict';
const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // ── Roles ──────────────────────────────────────────
  await knex('roles').del();
  const [adminRole, leaderRole, employeeRole] = await knex('roles').insert([
    {
      name: 'admin',
      permissions: JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        teams: ['create', 'read', 'update', 'delete'],
        targets: ['create', 'read', 'update', 'delete'],
        reports: ['read', 'export'],
        audit_logs: ['read'],
      }),
    },
    {
      name: 'team_leader',
      permissions: JSON.stringify({
        team_members: ['read'],
        targets: ['read'],
        reports: ['read', 'export'],
        entries: ['read'],
      }),
    },
    {
      name: 'employee',
      permissions: JSON.stringify({
        own_entries: ['create', 'read', 'update'],
        own_reports: ['read'],
      }),
    },
  ]).returning('*');

  // ── Default Admin Team ─────────────────────────────
  const [adminTeam] = await knex('teams').insert({
    name: 'Administration',
    description: 'System administrators',
    is_active: true,
  }).returning('*');

  // ── Default Admin User ─────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await knex('users').insert({
    role_id: adminRole.id,
    team_id: adminTeam.id,
    employee_code: 'EMP001',
    full_name: 'System Admin',
    email: 'admin@company.com',
    password_hash: passwordHash,
    is_active: true,
  });

  console.log('✅ Seed complete. Admin: admin@company.com / Admin@123');
};
