const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticateToken } = require('./auth');

// --- JOB ORDERS ---
router.get('/job-orders', async (req, res) => {
  try {
    const { emp_id } = req.query;
    let sql = `
      SELECT jo.*, e.name as emp_name, e.nik
      FROM job_orders jo
      JOIN employees e ON jo.emp_id = e.id
    `;
    const params = [];
    if (emp_id) {
      params.push(emp_id);
      sql += ' WHERE jo.emp_id = $1';
    }
    sql += ' ORDER BY jo.date DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch job orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/job-orders/:id/checkin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { checkin_photo, checkin_coords } = req.body;

    if (!checkin_photo) {
      return res.status(400).json({ error: 'Foto check-in selfie wajib diambil sebelum memulai penugasan' });
    }

    const { rows } = await query(`
      UPDATE job_orders SET
        status = 'Sedang Berjalan',
        checkin_photo = $1,
        checkin_coords = $2
      WHERE id = $3
      RETURNING *;
    `, [checkin_photo, checkin_coords || '-6.160, 106.840', id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Penugasan tidak ditemukan' });
    }

    res.json({ message: 'Check-in penugasan berhasil, tugas dimulai', job_order: rows[0] });
  } catch (err) {
    console.error('Job order check-in error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- RECRUITMENT & ONBOARDING ---
router.get('/fptk', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT f.*, d.name as department_name
      FROM fptk_requests f
      LEFT JOIN departments d ON f.department_id = d.id
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch FPTK error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/fptk', authenticateToken, async (req, res) => {
  try {
    const { position_title, department_id, requested_count = 1, reason, min_salary, max_salary } = req.body;
    const id = `FPTK-${Date.now()}`;
    const { rows } = await query(`
      INSERT INTO fptk_requests (id, position_title, department_id, requested_count, reason, min_salary, max_salary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [id, position_title, department_id, requested_count, reason, min_salary, max_salary]);

    res.status(201).json({ message: 'FPTK berhasil diajukan', fptk: rows[0] });
  } catch (err) {
    console.error('Create FPTK error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/onboarding', async (req, res) => {
  try {
    const { emp_id } = req.query;
    const { rows } = await query(`
      SELECT os.*, e.name as emp_name
      FROM onboarding_steps os
      JOIN employees e ON os.emp_id = e.id
      WHERE os.emp_id = $1
      ORDER BY os.step_order ASC
    `, [emp_id]);
    res.json(rows);
  } catch (err) {
    console.error('Fetch onboarding error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- TRAINING & SOP ---
router.get('/training', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM training_modules ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('Fetch training error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/training/attempt', authenticateToken, async (req, res) => {
  try {
    const { module_id, score, emp_id } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;

    const modRes = await query('SELECT * FROM training_modules WHERE id = $1', [module_id]);
    const trainingModule = modRes.rows[0];
    if (!trainingModule) return res.status(404).json({ error: 'Modul tidak ditemukan' });

    const isPassed = score >= trainingModule.passing_grade;
    const { rows } = await query(`
      INSERT INTO training_attempts (module_id, emp_id, score, is_passed)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [module_id, targetEmpId, score, isPassed]);

    res.json({
      message: isPassed ? 'Selamat! Anda lulus modul pelatihan.' : 'Nilai belum mencapai standar kelulusan (80%). Silakan remedial.',
      attempt: rows[0],
    });
  } catch (err) {
    console.error('Training attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sops', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.*, d.name as department_name
      FROM sops s
      LEFT JOIN departments d ON s.department_id = d.id
      ORDER BY s.code ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch SOPs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sops/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const sopId = req.params.id;
    const empId = req.user.emp_id;
    await query(`
      INSERT INTO sop_acknowledgements (sop_id, emp_id)
      VALUES ($1, $2)
    `, [sopId, empId]);
    res.json({ message: 'SOP telah dibaca dan dikonfirmasi' });
  } catch (err) {
    console.error('Acknowledge SOP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
