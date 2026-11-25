const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({ path: '.env.local' });
const { query, pool } = require('../src/db/connection');

test.after(async () => {
  await pool.end();
});

test('Neon PostgreSQL Smoke Test: Connectivity and Schema', async (t) => {
  await t.test('Ping query returns 1', async () => {
    const res = await query('SELECT 1 as result');
    assert.equal(res.rows[0].result, 1);
  });

  await t.test('Employees table exists and contains seeded records', async () => {
    const res = await query('SELECT count(*) as count FROM employees');
    const count = parseInt(res.rows[0].count, 10);
    assert.ok(count >= 11, `Expected at least 11 employees, found ${count}`);
  });

  await t.test('Users table contains credentials with active state', async () => {
    const res = await query("SELECT count(*) as count FROM users WHERE is_active = true");
    const count = parseInt(res.rows[0].count, 10);
    assert.ok(count >= 11, `Expected at least 11 active users, found ${count}`);
  });

  await t.test('Master organization tables are populated', async () => {
    const dirRes = await query('SELECT count(*) as count FROM directorates');
    const depRes = await query('SELECT count(*) as count FROM departments');
    const unitRes = await query('SELECT count(*) as count FROM units');
    assert.equal(parseInt(dirRes.rows[0].count, 10), 3);
    assert.ok(parseInt(depRes.rows[0].count, 10) >= 5);
    assert.ok(parseInt(unitRes.rows[0].count, 10) >= 7);
  });
});
