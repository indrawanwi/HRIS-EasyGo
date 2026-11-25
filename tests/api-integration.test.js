const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const { pool, query } = require('../src/db/connection');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test('HTTP REST API Integration Tests', async (t) => {
  let authToken = '';
  let employeeId = 'E04';

  await t.test('GET /api/v1/health returns database connectivity', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'UP');
    assert.ok(body.database.includes('Neon PostgreSQL'));
  });

  await t.test('POST /api/v1/auth/login with valid NIK authenticates and issues token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '20210904', // Rizky Pratama NIK
        password: 'easygo123',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.empId, 'E04');
    authToken = body.token;
  });

  await t.test('POST /api/v1/auth/login rejects invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '20210904',
        password: 'wrongpassword',
      }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/v1/me returns authenticated employee profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.empId, 'E04');
    assert.equal(body.employee.name, 'Rizky Pratama');
    assert.equal(body.employee.position_title, 'Teknisi instalasi GPS');
  });

  await t.test('GET /api/v1/employees returns employee directory', async () => {
    const res = await fetch(`${baseUrl}/api/v1/employees`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 11);
  });

  await t.test('GET /api/v1/master/departments returns master data', async () => {
    const res = await fetch(`${baseUrl}/api/v1/master/departments`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 5);
  });

  await t.test('POST /api/v1/attendance/check-in records clock-in telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/v1/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        location: 'Pool Armada Barat',
        coords: '-6.175, 106.827',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.record);
    assert.equal(body.record.emp_id, 'E04');
  });

  await t.test('POST /api/v1/requests submits leave and rejects overlapping leave request', async () => {
    const uniqueStart = '2026-12-10'; // Future workdays (Thu-Fri)
    const uniqueEnd = '2026-12-11';

    // Clean up any previous test requests for idempotency
    await query("DELETE FROM requests WHERE emp_id = 'E04' AND details->>'mulai' = $1", [uniqueStart]);

    // First leave submission should succeed
    const res1 = await fetch(`${baseUrl}/api/v1/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: 'cuti',
        details: {
          jenis: 'JC-01',
          mulai: uniqueStart,
          selesai: uniqueEnd,
        },
        notes: 'Uji integrasi cuti pertama',
      }),
    });
    assert.equal(res1.status, 201);
    const body1 = await res1.json();
    assert.ok(body1.request.id);

    // Overlapping leave submission for the same dates MUST be rejected with 400
    const res2 = await fetch(`${baseUrl}/api/v1/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: 'cuti',
        details: {
          jenis: 'JC-01',
          mulai: uniqueStart,
          selesai: uniqueEnd,
        },
        notes: 'Uji pengajuan cuti bertabrakan',
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.ok(body2.error.includes('bertabrakan'));

    // Clean up
    await query("DELETE FROM requests WHERE emp_id = 'E04' AND details->>'mulai' = $1", [uniqueStart]);
  });

  await t.test('POST /api/v1/payroll/golden-tests executes all regulatory scenarios with 100% pass', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payroll/golden-tests`, { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.allPassed, true);
    assert.ok(body.passedCount >= 10);
    assert.equal(body.passedCount, body.totalCount);
  });
});
