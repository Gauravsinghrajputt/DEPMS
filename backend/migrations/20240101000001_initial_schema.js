'use strict';

exports.up = async function (knex) {
  // ── Enable UUID extension ──────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // ── roles ──────────────────────────────────────────
  await knex.schema.createTable('roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 50).notNullable().unique(); // admin | team_leader | employee
    t.jsonb('permissions').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── teams ──────────────────────────────────────────
  await knex.schema.createTable('teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 100).notNullable();
    t.text('description');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ── users ──────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
    t.string('employee_code', 20).notNullable().unique();
    t.string('full_name', 150).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_login');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Leader FK on teams (after users table exists)
  await knex.schema.alterTable('teams', (t) => {
    t.uuid('leader_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });

  // ── targets ───────────────────────────────────────
  await knex.schema.createTable('targets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL');
    t.integer('year').notNullable();
    t.integer('month').notNullable(); // 1-12
    t.integer('monthly_target').notNullable().defaultTo(0);
    t.integer('daily_target').notNullable().defaultTo(0);
    t.integer('working_days').notNullable().defaultTo(26);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'year', 'month']);
  });

  // ── daily_entries ──────────────────────────────────
  await knex.schema.createTable('daily_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('target_id').nullable().references('id').inTable('targets').onDelete('SET NULL');
    t.date('entry_date').notNullable();
    t.integer('first_half_count').defaultTo(0);
    t.integer('second_half_count').defaultTo(0);
    t.integer('completed_forms').notNullable().defaultTo(0);
    t.integer('half_day_count').defaultTo(0);
    t.boolean('is_submitted').defaultTo(false);
    t.time('submitted_at');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'entry_date']);
  });

  // ── attendance ─────────────────────────────────────
  await knex.schema.createTable('attendance', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('attendance_date').notNullable();
    t.enu('status', ['present', 'absent', 'half_day', 'leave']).defaultTo('present');
    t.time('check_in');
    t.time('check_out');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'attendance_date']);
  });

  // ── monthly_reports ────────────────────────────────
  await knex.schema.createTable('monthly_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('target_id').nullable().references('id').inTable('targets').onDelete('SET NULL');
    t.integer('year').notNullable();
    t.integer('month').notNullable();
    t.integer('total_completed').defaultTo(0);
    t.integer('total_target').defaultTo(0);
    t.decimal('achievement_pct', 5, 2).defaultTo(0);
    t.decimal('avg_daily', 8, 2).defaultTo(0);
    t.integer('days_worked').defaultTo(0);
    t.timestamp('generated_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'year', 'month']);
  });

  // ── notifications ──────────────────────────────────
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 50).notNullable(); // low_performance | target_achieved | reminder
    t.string('title', 200).notNullable();
    t.text('message');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── audit_logs ─────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable(); // CREATE | UPDATE | DELETE | LOGIN | EXPORT
    t.string('entity_type', 100);
    t.uuid('entity_id').nullable();
    t.jsonb('old_value');
    t.jsonb('new_value');
    t.string('ip_address', 45);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Indexes ────────────────────────────────────────
  await knex.raw('CREATE INDEX idx_daily_entries_user_date ON daily_entries(user_id, entry_date)');
  await knex.raw('CREATE INDEX idx_daily_entries_date ON daily_entries(entry_date)');
  await knex.raw('CREATE INDEX idx_targets_user_month ON targets(user_id, year, month)');
  await knex.raw('CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC)');
  await knex.raw('CREATE INDEX idx_notifications_user ON notifications(user_id, is_read)');
};

exports.down = async function (knex) {
  const tables = [
    'audit_logs', 'notifications', 'monthly_reports', 'attendance',
    'daily_entries', 'targets', 'users', 'teams', 'roles',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
