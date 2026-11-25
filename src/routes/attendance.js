const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticateToken } = require('./auth');

// GET /api/v1/attendance
router.get('/', async (req, res) => {
  try {
    const { emp_id, date, start_date, end_date } = req.query;
    let sql = `
      SELECT a.*, e.name as emp_name, e.nik, e.position_title
      FROM attendance_records a
      JOIN employees e ON a.emp_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (emp_id) {
      params.push(emp_id);
      sql += ` AND a.emp_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND a.date = $${params.length}`;
    }
    if (start_date && end_date) {
      params.push(start_date, end_date);
      sql += ` AND a.date >= $${params.length - 1} AND a.date <= $${params.length}`;
    }
    sql += ` ORDER BY a.date DESC, a.created_at DESC`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/attendance/check-in
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const { emp_id, location, coords, photo_url } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5); // HH:mm

    const id = `AB-${targetEmpId}-${today}`;
    const { rows } = await query(`
      INSERT INTO attendance_records (
        id, emp_id, date, clock_in, location_in, coords_in, photo_in, match_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Match')
      ON CONFLICT (id) DO UPDATE SET
        clock_in = EXCLUDED.clock_in,
        location_in = EXCLUDED.location_in,
        coords_in = EXCLUDED.coords_in,
        photo_in = EXCLUDED.photo_in
      RETURNING *;
    `, [id, targetEmpId, today, timeNow, location || 'Kantor Kemayoran', coords || '-6.160, 106.840', photo_url || '']);

    res.json({ message: 'Absensi masuk berhasil dicatat', record: rows[0] });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/attendance/check-out
router.post('/check-out', authenticateToken, async (req, res) => {
  try {
    const { emp_id, location, coords, photo_url } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 5); // HH:mm

    const id = `AB-${targetEmpId}-${today}`;
    const { rows } = await query(`
      UPDATE attendance_records SET
        clock_out = $1,
        location_out = $2,
        coords_out = $3,
        photo_out = $4
      WHERE id = $5
      RETURNING *;
    `, [timeNow, location || 'Kantor Kemayoran', coords || '-6.160, 106.840', photo_url || '', id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Data absensi masuk hari ini belum ditemukan' });
    }

    res.json({ message: 'Absensi pulang berhasil dicatat', record: rows[0] });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/attendance/timesheets
router.get('/timesheets', async (req, res) => {
  try {
    const { emp_id } = req.query;
    let sql = `
      SELECT t.*, e.name as emp_name, e.nik
      FROM timesheets t
      JOIN employees e ON t.emp_id = e.id
    `;
    const params = [];
    if (emp_id) {
      params.push(emp_id);
      sql += ` WHERE t.emp_id = $1`;
    }
    sql += ` ORDER BY t.date DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch timesheets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/attendance/timesheets
router.post('/timesheets', authenticateToken, async (req, res) => {
  try {
    const { emp_id, date, start_time, end_time, activity, notes, coords, proof_url } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;
    const today = date || new Date().toISOString().slice(0, 10);
    const id = `TS-${Date.now()}`;

    const { rows } = await query(`
      INSERT INTO timesheets (id, emp_id, date, start_time, end_time, activity, notes, coords, proof_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [id, targetEmpId, today, start_time || '08:00', end_time || '17:00', activity || 'Pekerjaan harian', notes || '', coords || '', proof_url || '']);

    res.status(201).json({ message: 'Timesheet berhasil disimpan', timesheet: rows[0] });
  } catch (err) {
    console.error('Create timesheet error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/attendance/fit-to-work
router.post('/fit-to-work', authenticateToken, async (req, res) => {
  try {
    const { emp_id, is_fit, answers, notes } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;
    const today = new Date().toISOString().slice(0, 10);
    const id = `FTW-${targetEmpId}-${today}`;

    const { rows } = await query(`
      INSERT INTO fit_to_work (id, emp_id, date, is_fit, answers, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        is_fit = EXCLUDED.is_fit,
        answers = EXCLUDED.answers,
        notes = EXCLUDED.notes
      RETURNING *;
    `, [id, targetEmpId, today, is_fit !== false, JSON.stringify(answers || {}), notes || '']);

    res.json({ message: 'Fit to work assessment tersimpan', record: rows[0] });
  } catch (err) {
    console.error('Fit to work error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
