const express = require('express');
const router = express.Router();
const { query, getClient } = require('../db/connection');
const { authenticateToken } = require('./auth');
const { validateLeaveRequest } = require('../features/requests/rules/leave');
const { validateOvertimeRequest } = require('../features/requests/rules/overtime');
const { determineApprovalRoute, processApprovalDecision } = require('../features/approvals/engine');

// GET /api/v1/requests
router.get('/', async (req, res) => {
  try {
    const { emp_id, type, status } = req.query;
    let sql = `
      SELECT r.*, e.name as emp_name, e.nik, e.position_title
      FROM requests r
      JOIN employees e ON r.emp_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (emp_id) {
      params.push(emp_id);
      sql += ` AND r.emp_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND r.type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }
    sql += ` ORDER BY r.created_at DESC`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/requests/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reqRes = await query(`
      SELECT r.*, e.name as emp_name, e.nik, e.position_title
      FROM requests r
      JOIN employees e ON r.emp_id = e.id
      WHERE r.id = $1
    `, [id]);

    if (!reqRes.rows[0]) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    const routeRes = await query(`
      SELECT ar.*, u.name as approver_name
      FROM approval_routes ar
      LEFT JOIN users u ON ar.approver_id = u.id OR ar.approver_id = u.emp_id
      WHERE ar.request_id = $1
      ORDER BY ar.step_order ASC
    `, [id]);

    res.json({
      request: reqRes.rows[0],
      routes: routeRes.rows,
    });
  } catch (err) {
    console.error('Fetch request detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/requests (Submit new request with business rule validation & pessimistic locking)
router.post('/', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { type, details = {}, notes = '', emp_id } = req.body;
    const targetEmpId = emp_id || req.user.emp_id;

    if (!type) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Jenis pengajuan wajib diisi' });
    }

    // Fetch employee data
    const empRes = await client.query('SELECT * FROM employees WHERE id = $1', [targetEmpId]);
    const employee = empRes.rows[0];
    if (!employee) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Employee not found' });
    }

    // 1. Business Rule Validation
    if (type === 'cuti') {
      const leaveTypeId = details.jenis || 'JC-01';
      const leaveTypeRes = await client.query('SELECT * FROM leave_types WHERE id = $1', [leaveTypeId]);
      const leaveType = leaveTypeRes.rows[0] || { id: leaveTypeId, name: 'Cuti tahunan', has_quota: true };

      // Query existing active leaves for overlap prevention
      const existingRes = await client.query(`
        SELECT id, details->>'mulai' as start_date, details->>'selesai' as end_date, status,
               COALESCE((details->>'hari')::int, 0) as days
        FROM requests
        WHERE emp_id = $1 AND type = 'cuti' AND status NOT IN ('Ditolak', 'Dibatalkan')
      `, [targetEmpId]);
      const existingLeaves = existingRes.rows;

      // Pessimistic row locking on leave quota
      const quotaRes = await client.query(`
        SELECT * FROM leave_quotas
        WHERE emp_id = $1 AND leave_type_id = $2 AND year = 2026
        FOR UPDATE
      `, [targetEmpId, leaveType.id]);

      const quotaRemaining = quotaRes.rows[0] ? quotaRes.rows[0].remaining_days : 12;

      // Also compute pending unapproved leave days to avoid overbooking
      const pendingDays = existingLeaves
        .filter((l) => ['Menunggu Atasan', 'Menunggu HR', 'Menunggu'].includes(l.status))
        .reduce((sum, l) => sum + (l.days || 0), 0);
      const effectiveAvailableQuota = Math.max(0, quotaRemaining - pendingDays);

      const validation = validateLeaveRequest({
        leaveType,
        startDateStr: details.mulai,
        endDateStr: details.selesai,
        quotaRemaining: effectiveAvailableQuota,
        existingLeaves,
      });

      if (!validation.isValid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.errors.join(', ') });
      }
      details.hari = validation.workingDays;
    } else if (type === 'lembur') {
      const validation = validateOvertimeRequest({
        startTimeStr: details.mulai || '18:00',
        endTimeStr: details.selesai || '21:00',
        isHoliday: !!details.is_holiday,
      });
      if (!validation.isValid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.errors.join(', ') });
      }
      details.jam = validation.hours;
    }

    // 2. Generate Request ID
    const reqId = `RQ-${Date.now().toString().slice(-6)}`;

    // 3. Determine Approval Routes (Strict Anti-Self-Approval)
    const approvalSteps = determineApprovalRoute({
      requestType: type,
      employee,
    });

    const initialStatus = approvalSteps.length > 0 ? 'Menunggu Atasan' : 'Disetujui';

    // Insert Request
    const insReq = await client.query(`
      INSERT INTO requests (id, emp_id, type, status, details, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [reqId, targetEmpId, type, initialStatus, JSON.stringify(details), notes]);

    // Insert Approval Routes
    for (const step of approvalSteps) {
      await client.query(`
        INSERT INTO approval_routes (request_id, step_order, approver_role, approver_id, status)
        VALUES ($1, $2, $3, $4, $5);
      `, [reqId, step.step_order, step.approver_role, step.approver_id, step.step_order === 1 ? 'Menunggu' : 'Antri']);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Pengajuan berhasil dikirim',
      request: insReq.rows[0],
      routes: approvalSteps,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit request error:', err);
    res.status(500).json({ error: err.message || 'Gagal mengirim pengajuan' });
  } finally {
    client.release();
  }
});

// GET /api/v1/approvals/pending (Pending approvals for current user)
router.get('/approvals/pending', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentEmpId = req.user.emp_id;

    const { rows } = await query(`
      SELECT ar.*, r.type as request_type, r.details as request_details, r.notes as request_notes,
             r.created_at as request_created_at, e.name as requester_name, e.nik as requester_nik,
             e.position_title as requester_position
      FROM approval_routes ar
      JOIN requests r ON ar.request_id = r.id
      JOIN employees e ON r.emp_id = e.id
      WHERE ar.status = 'Menunggu'
        AND (ar.approver_id = $1 OR ar.approver_id = $2 OR $3 = ANY(string_to_array($4, ',')))
      ORDER BY r.created_at ASC
    `, [currentUserId, currentEmpId, req.user.roles[0] || '', req.user.roles.join(',')]);

    res.json(rows);
  } catch (err) {
    console.error('Fetch pending approvals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/approvals/:id/decide (Process approval decision with pessimistic locking)
router.post('/approvals/:id/decide', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const routeId = req.params.id;
    const { decision, comments = '' } = req.body; // 'Disetujui', 'Ditolak', 'Revisi'

    const routeRes = await client.query('SELECT * FROM approval_routes WHERE id = $1', [routeId]);
    const route = routeRes.rows[0];
    if (!route) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Langkah persetujuan tidak ditemukan' });
    }

    const reqRes = await client.query('SELECT * FROM requests WHERE id = $1', [route.request_id]);
    const request = reqRes.rows[0];

    // Anti-Self-Approval Verification:
    // Requesters can NEVER approve their own request
    if (request.emp_id === req.user.emp_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Pelanggaran pemisahan tugas: Anda tidak dapat menyetujui pengajuan milik Anda sendiri!'
      });
    }

    const allRoutesRes = await client.query('SELECT * FROM approval_routes WHERE request_id = $1 ORDER BY step_order ASC', [request.id]);
    const totalSteps = allRoutesRes.rows.length;

    const evaluation = processApprovalDecision({
      currentStep: route.step_order,
      totalSteps,
      decision,
      actorUserId: req.user.emp_id || req.user.id,
      expectedApproverId: route.approver_id,
    });

    if (!evaluation.allowed) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: evaluation.error });
    }

    // Update this route step
    await client.query(`
      UPDATE approval_routes SET
        status = $1,
        comments = $2,
        acted_at = NOW()
      WHERE id = $3
    `, [decision, comments, routeId]);

    // Update Request status
    await client.query(`
      UPDATE requests SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [evaluation.nextRequestStatus, request.id]);

    // If there is a next step, activate it
    if (evaluation.nextStep) {
      await client.query(`
        UPDATE approval_routes SET status = 'Menunggu'
        WHERE request_id = $1 AND step_order = $2
      `, [request.id, evaluation.nextStep]);
    }

    // If leave approved and completed, deduct leave quota with pessimistic row locking
    if (request.type === 'cuti' && evaluation.isCompleted && decision === 'Disetujui') {
      const days = parseInt(request.details.hari, 10) || 1;
      const leaveTypeId = request.details.jenis || 'JC-01';

      // Lock quota row
      const qRes = await client.query(`
        SELECT * FROM leave_quotas
        WHERE emp_id = $1 AND leave_type_id = $2 AND year = 2026
        FOR UPDATE
      `, [request.emp_id, leaveTypeId]);

      if (qRes.rows[0] && qRes.rows[0].remaining_days < days) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Sisa kuota cuti tidak mencukupi untuk menyelesaikan persetujuan (${qRes.rows[0].remaining_days} hari tersisa, dibutuhkan ${days} hari)`
        });
      }

      await client.query(`
        UPDATE leave_quotas SET
          used_days = used_days + $1,
          remaining_days = remaining_days - $1
        WHERE emp_id = $2 AND leave_type_id = $3 AND year = 2026 AND remaining_days >= $1
      `, [days, request.emp_id, leaveTypeId]);
    }

    // If monetary transaction approved and completed, create pending disbursement
    if (['um', 'rb', 'pin'].includes(request.type) && evaluation.isCompleted && decision === 'Disetujui') {
      const amount = request.details.nominal || request.details.amount || 0;
      await client.query(`
        INSERT INTO disbursements (id, request_id, emp_id, amount, method, status)
        VALUES ($1, $2, $3, $4, 'Transfer', 'Menunggu Pencairan')
        ON CONFLICT (id) DO NOTHING;
      `, [`DB-${request.id}`, request.id, request.emp_id, amount]);
    }

    await client.query('COMMIT');
    res.json({
      message: `Persetujuan berhasil diproses (${decision})`,
      nextStatus: evaluation.nextRequestStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Process decision error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/v1/finance/disburse
router.post('/finance/disburse', authenticateToken, async (req, res) => {
  try {
    const { request_id, proof_url = '' } = req.body;
    if (!request_id) {
      return res.status(400).json({ error: 'request_id wajib disertakan' });
    }

    const { rows } = await query(`
      UPDATE disbursements SET
        status = 'Dibayar',
        proof_url = $1,
        disbursed_by = $2,
        disbursed_at = NOW()
      WHERE request_id = $3
      RETURNING *;
    `, [proof_url, req.user.name, request_id]);

    await query(`
      UPDATE requests SET status = 'Selesai', updated_at = NOW()
      WHERE id = $1
    `, [request_id]);

    res.json({ message: 'Pencairan dana berhasil dikonfirmasi', disbursement: rows[0] });
  } catch (err) {
    console.error('Disbursement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
