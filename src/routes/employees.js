const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, getClient } = require('../db/connection');
const { authenticateToken } = require('./auth');

// GET /api/v1/employees
router.get('/', async (req, res) => {
  try {
    const { department, search, is_active } = req.query;
    let sql = `
      SELECT e.*, d.name as department_name, dir.name as directorate_name, g.name as grade_name,
             m.name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN directorates dir ON e.directorate_id = dir.id
      LEFT JOIN grades g ON e.grade_id = g.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      params.push(department);
      sql += ` AND e.department_id = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      sql += ` AND e.is_active = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (e.name ILIKE $${params.length} OR e.nik ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY e.id ASC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT e.*, d.name as department_name, dir.name as directorate_name, g.name as grade_name,
             m.name as manager_name, c.contract_type, c.basic_salary, c.start_date as contract_start
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN directorates dir ON e.directorate_id = dir.id
      LEFT JOIN grades g ON e.grade_id = g.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN contracts c ON e.id = c.emp_id
      WHERE e.id = $1 OR e.nik = $1
    `, [id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch employee detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/employees (Atomic Creation of Employee + Contract + Quota + User)
router.post('/', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      id, nik, name, position_title, directorate_id, department_id, unit_id,
      grade_id, schedule_id, manager_id, join_date, phone, email, ptkp,
      contract_type = 'PKWTT', basic_salary = 5000000
    } = req.body;

    if (!nik || !name || !email) {
      return res.status(400).json({ error: 'NIK, Nama, dan Email wajib diisi' });
    }

    // Auto generate ID if not supplied
    let empId = id;
    if (!empId) {
      const countRes = await client.query('SELECT count(*) FROM employees');
      empId = 'E' + ('0' + (parseInt(countRes.rows[0].count, 10) + 1)).slice(-2);
    }

    // 1. Insert Employee
    const empInsert = await client.query(`
      INSERT INTO employees (
        id, nik, name, position_title, directorate_id, department_id, unit_id,
        grade_id, schedule_id, manager_id, join_date, phone, email, ptkp, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *;
    `, [
      empId, nik, name, position_title || 'Staff',
      directorate_id || 'DR-01', department_id || 'DP-01', unit_id || 'UN-01',
      grade_id || 'GR-01', schedule_id || 'JD-01', manager_id || null,
      join_date || new Date().toISOString().slice(0, 10), phone || '-', email, ptkp || 'TK/0'
    ]);

    // 2. Insert Contract
    await client.query(`
      INSERT INTO contracts (id, emp_id, contract_type, start_date, basic_salary)
      VALUES ($1, $2, $3, $4, $5);
    `, ['CT-' + empId, empId, contract_type, join_date || new Date().toISOString().slice(0, 10), basic_salary]);

    // 3. Allocate Initial Leave Quota
    const currentYear = new Date().getFullYear();
    await client.query(`
      INSERT INTO leave_quotas (emp_id, leave_type_id, year, allocated_days, used_days, remaining_days)
      VALUES ($1, 'JC-01', $2, 12, 0, 12)
      ON CONFLICT DO NOTHING;
    `, [empId, currentYear]);

    // 4. Create Pending/Active User Account
    const defaultPasswordHash = crypto.createHash('sha256').update('easygo123').digest('hex');
    await client.query(`
      INSERT INTO users (id, emp_id, name, email, password_hash, roles, access, is_active)
      VALUES ($1, $2, $3, $4, $5, '["karyawan"]'::jsonb, '["web", "hp"]'::jsonb, true)
      ON CONFLICT (email) DO NOTHING;
    `, ['US-' + empId, empId, name, email, defaultPasswordHash]);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Karyawan berhasil ditambahkan beserta kontrak, kuota cuti, dan akun pengguna',
      employee: empInsert.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create employee error:', err);
    res.status(500).json({ error: err.message || 'Gagal menambahkan karyawan' });
  } finally {
    client.release();
  }
});

// DELETE /api/v1/employees/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Check if employee is manager of others
    const subRes = await query('SELECT count(*) FROM employees WHERE manager_id = $1 AND is_active = true', [id]);
    if (parseInt(subRes.rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'Tidak dapat menghapus karyawan ini karena masih menjadi atasan langsung karyawan lain.'
      });
    }

    await query('UPDATE employees SET is_active = false WHERE id = $1', [id]);
    await query('UPDATE users SET is_active = false WHERE emp_id = $1', [id]);
    res.json({ message: 'Karyawan berhasil dinonaktifkan' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
