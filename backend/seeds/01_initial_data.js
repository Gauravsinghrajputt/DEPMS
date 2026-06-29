'use strict';
const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Delete in correct order
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('daily_entries').del();
  await knex('targets').del();
  await knex('attendance').del();
  await knex('monthly_reports').del();
  await knex('users').del();
  await knex('teams').del();
  await knex('roles').del();

  const [adminRole] = await knex('roles').insert([
    { name: 'admin', permissions: JSON.stringify({ users: ['create','read','update','delete'], teams: ['create','read','update','delete'], targets: ['create','read','update','delete'], reports: ['read','export'], audit_logs: ['read'] }) }
  ]).returning('*');

  const [leaderRole] = await knex('roles').insert([
    { name: 'team_leader', permissions: JSON.stringify({ team_members: ['read'], targets: ['read'], reports: ['read','export'], entries: ['read'] }) }
  ]).returning('*');

  const [employeeRole] = await knex('roles').insert([
    { name: 'employee', permissions: JSON.stringify({ own_entries: ['create','read','update'], own_reports: ['read'] }) }
  ]).returning('*');

  const [adminTeam] = await knex('teams').insert({
    name: 'Administration',
    description: 'System administrators',
    is_active: true,
  }).returning('*');

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

  console.log('Seed complete. Admin: admin@company.com / Admin@123');
};
