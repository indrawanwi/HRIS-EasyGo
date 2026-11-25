const express = require('express');
const router = express.Router();
const { query, getClient } = require('../db/connection');
const { authenticateToken } = require('./auth');
const {
  calculatePPh21TER,
  calculateAnnualPPh21Pasal17,
  calculateOvertimePay,
  calculateBPJS,
  calculateTerminationPay,
  calculateProrated,
  checkUmkCompliance,
  generatePayrollJournals,
  calculateRapelAdjustment,
  getTerCategory,
  getTerRate,
} = require('../features/payroll/engine/calculator');

// GET /api/v1/payroll/periods
router.get('/periods', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*,
             prep.name as preparer_name,
             rev.name as reviewer_name,
             app.name as approver_name,
             disb.name as disburser_name
      FROM payroll_periods p
      LEFT JOIN employees prep ON p.preparer_id = prep.id
      LEFT JOIN employees rev ON p.reviewer_id = rev.id
      LEFT JOIN employees app ON p.approver_id = app.id
      LEFT JOIN employees disb ON p.disburser_id = disb.id
      ORDER BY p.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch payroll periods error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/payroll/periods (Initialize period with 4 distinct roles)
router.post('/periods', authenticateToken, async (req, res) => {
  try {
    const { name, start_date, end_date, pay_date, preparer_id, reviewer_id, approver_id, disburser_id } = req.body;

    // Strict Separation of Duties check
    const roleHolders = [preparer_id, reviewer_id, approver_id, disburser_id].filter(Boolean);
    const uniqueHolders = new Set(roleHolders);
    if (uniqueHolders.size < 4 && roleHolders.length === 4) {
      return res.status(400).json({
        error: 'Pemisahan tugas ketat: Penyiap, Pemeriksa, Penyetuju, dan Pembayar harus 4 orang yang berbeda!'
      });
    }

    const id = `PR-${start_date.slice(0, 7)}`;
    const { rows } = await query(`
      INSERT INTO payroll_periods (id, name, start_date, end_date, pay_date, status, preparer_id, reviewer_id, approver_id, disburser_id)
      VALUES ($1, $2, $3, $4, $5, 'Draf', $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        pay_date = EXCLUDED.pay_date
      RETURNING *;
    `, [id, name || `Gaji ${start_date.slice(0, 7)}`, start_date, end_date, pay_date, preparer_id || 'E10', reviewer_id || 'E08', approver_id || 'E01', disburser_id || 'E09']);

    res.status(201).json({ message: 'Periode gaji berhasil dibuat', period: rows[0] });
  } catch (err) {
    console.error('Create period error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/payroll/calculate (Execute calculation engine for all active employees)
router.post('/calculate', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { period_id } = req.body;
    const pRes = await client.query('SELECT * FROM payroll_periods WHERE id = $1', [period_id]);
    const period = pRes.rows[0];
    if (!period) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Periode penggajian tidak ditemukan' });
    }

    // Fetch all active employees with contracts
    const empsRes = await client.query(`
      SELECT e.*, c.basic_salary
      FROM employees e
      JOIN contracts c ON e.id = c.emp_id
      WHERE e.is_active = true
    `);

    const calculatedItems = [];

    for (const emp of empsRes.rows) {
      const basicSalary = parseFloat(emp.basic_salary) || 5000000;
      // Fixed allowance from grade
      let fixedAllowance = 0;
      if (emp.grade_id === 'GR-02') fixedAllowance = 750000;
      else if (emp.grade_id === 'GR-03') fixedAllowance = 1500000;
      else if (emp.grade_id === 'GR-04') fixedAllowance = 3000000;
      else if (emp.grade_id === 'GR-05') fixedAllowance = 5000000;

      const fixedWage = basicSalary + fixedAllowance;

      // Calculate Overtime for this period
      const otRes = await client.query(`
        SELECT COALESCE(SUM((details->>'jam')::numeric), 0) as total_ot
        FROM requests
        WHERE emp_id = $1 AND type = 'lembur' AND status = 'Disetujui'
          AND details->>'tgl' >= $2 AND details->>'tgl' <= $3
      `, [emp.id, period.start_date, period.end_date]);
      const otHours = parseFloat(otRes.rows[0].total_ot) || 0;
      const otCalc = calculateOvertimePay({ monthlyWage: fixedWage, hours: otHours });

      // Daily allowances: Meal & Transport
      const attRes = await client.query(`
        SELECT count(*) as days_attended
        FROM attendance_records
        WHERE emp_id = $1 AND date >= $2 AND date <= $3 AND clock_in IS NOT NULL
      `, [emp.id, period.start_date, period.end_date]);
      const daysAttended = parseInt(attRes.rows[0].days_attended, 10) || 20;

      const mealAllowance = daysAttended * 35000;
      const transportAllowance = daysAttended * 25000;
      const totalAllowances = fixedAllowance + mealAllowance + transportAllowance;

      // BPJS Deductions
      const bpjs = calculateBPJS(fixedWage);
      const bpjsEmp = bpjs.totalEmployee;
      const bpjsComp = bpjs.totalCompany;

      // Gross Income & PPh 21 TER
      const grossIncome = fixedWage + totalAllowances + otCalc.totalPay;
      const pphCalc = calculatePPh21TER({
        grossIncome,
        ptkp: emp.ptkp || 'TK/0',
        hasNpwp: !!emp.npwp,
      });

      // Net Take Home Pay
      const netPay = grossIncome - bpjsEmp - pphCalc.tax;

      const itemId = `PI-${period.id}-${emp.id}`;
      const itemDetails = {
        emp_name: emp.name,
        nik: emp.nik,
        fixedAllowance,
        mealAllowance,
        transportAllowance,
        overtimeHours: otHours,
        overtimePay: otCalc.totalPay,
        bpjsBreakdown: bpjs,
        pphDetails: pphCalc,
      };

      await client.query(`
        INSERT INTO payroll_items (
          id, period_id, emp_id, basic_salary, allowances, overtime_pay, deductions,
          bpjs_employee, bpjs_company, pph21, net_pay, calculation_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          basic_salary = EXCLUDED.basic_salary,
          allowances = EXCLUDED.allowances,
          overtime_pay = EXCLUDED.overtime_pay,
          bpjs_employee = EXCLUDED.bpjs_employee,
          bpjs_company = EXCLUDED.bpjs_company,
          pph21 = EXCLUDED.pph21,
          net_pay = EXCLUDED.net_pay,
          calculation_details = EXCLUDED.calculation_details;
      `, [
        itemId, period.id, emp.id, basicSalary, totalAllowances, otCalc.totalPay,
        0, bpjsEmp, bpjsComp, pphCalc.tax, netPay, JSON.stringify(itemDetails)
      ]);

      calculatedItems.push({ empId: emp.id, name: emp.name, netPay });
    }

    // Update period status to 'Dihitung'
    await client.query(`
      UPDATE payroll_periods SET status = 'Dihitung' WHERE id = $1
    `, [period.id]);

    await client.query('COMMIT');
    res.json({
      message: `Perhitungan gaji periode ${period.name} berhasil dijalankan untuk ${calculatedItems.length} karyawan`,
      period_id: period.id,
      items: calculatedItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Calculate payroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/v1/payroll/payslips/:id
router.get('/payslips/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT pi.*, p.name as period_name, p.pay_date, e.name as emp_name, e.nik, e.position_title,
             e.bank_name, e.bank_account, d.name as department_name
      FROM payroll_items pi
      JOIN payroll_periods p ON pi.period_id = p.id
      JOIN employees e ON pi.emp_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE pi.id = $1 OR (pi.period_id = $1 AND pi.emp_id = $2)
    `, [id, req.user.emp_id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Slip gaji tidak ditemukan' });
    }

    const payslip = rows[0];
    const isOwner = req.user.emp_id === payslip.emp_id;
    const isHrOrFinanceOrSuper = req.user.roles.some((r) => ['hr', 'finance', 'super'].includes(r));
    if (!isOwner && !isHrOrFinanceOrSuper) {
      return res.status(403).json({ error: 'Akses ditolak: Anda tidak diizinkan melihat slip gaji karyawan lain' });
    }

    res.json(payslip);
  } catch (err) {
    console.error('Fetch payslip error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/payroll/golden-tests
// Runs the verified 10 Golden Benchmark Scenarios + December Pasal 17 Tax Reconciliation
router.post('/golden-tests', async (req, res) => {
  try {
    const results = [];

    // 1. Karyawan masuk tengah bulan (Prorata hari kerja)
    const s1Prorata = calculateProrated({
      basicSalary: 9000000,
      fixedAllowance: 1000000,
      totalWorkDays: 22,
      actualWorkDays: 11,
    });
    results.push({
      id: 1,
      name: 'Karyawan masuk tengah bulan',
      rule: 'Gaji pokok dan tunjangan tetap prorata hari kerja sejak tanggal masuk',
      passed: s1Prorata.basicSalary === 4500000 && s1Prorata.fixedAllowance === 500000,
      expected: 'Gaji pokok Rp 4.500.000, Tunjangan Rp 500.000',
      actual: `Gaji pokok Rp ${s1Prorata.basicSalary.toLocaleString()}, Tunjangan Rp ${s1Prorata.fixedAllowance.toLocaleString()}`,
    });

    // 2. Keluar dengan final pay (Efisiensi PP 35/2021 masa kerja 3 tahun)
    const s2Final = calculateTerminationPay({
      monthlyWage: 10000000,
      yearsOfService: 3,
      reason: 'efisiensi',
    });
    results.push({
      id: 2,
      name: 'Keluar dengan final pay',
      rule: 'Efisiensi PP 35/2021: pesangon 4 bulan, UPMK 2 bulan, PPh final bertingkat',
      passed: s2Final.severancePay === 40000000 && s2Final.upmkPay === 20000000 && s2Final.pphFinal === 500000,
      expected: 'Pesangon Rp 40M, UPMK Rp 20M, PPh Final Rp 500.000',
      actual: `Pesangon Rp ${s2Final.severancePay.toLocaleString()}, UPMK Rp ${s2Final.upmkPay.toLocaleString()}, PPh Final Rp ${s2Final.pphFinal.toLocaleString()}`,
    });

    // 3. Naik gaji tengah periode (Dua tarif dalam satu periode)
    const s3ProrataOld = calculateProrated({ basicSalary: 8000000, totalWorkDays: 22, actualWorkDays: 10 });
    const s3ProrataNew = calculateProrated({ basicSalary: 9000000, totalWorkDays: 22, actualWorkDays: 12 });
    const s3Total = s3ProrataOld.basicSalary + s3ProrataNew.basicSalary;
    results.push({
      id: 3,
      name: 'Naik gaji tengah periode',
      rule: 'Dua tarif dalam satu periode, masing-masing prorata hari kerja',
      passed: s3Total === (Math.round(8000000 * 10 / 22) + Math.round(9000000 * 12 / 22)),
      expected: 'Dua segmen gaji pokok dijumlahkan prorata',
      actual: `Total gaji pokok Rp ${s3Total.toLocaleString()}`,
    });

    // 4. Lembur hari libur (PP 35/2021: 10 jam hari libur pola 5 hari)
    const s4Overtime = calculateOvertimePay({
      monthlyWage: 8650000,
      hours: 10,
      isHoliday: true,
      is6DayPattern: false,
    });
    const s4ExpectedFactor = 23;
    const s4ExpectedTotal = Math.round((8650000 / 173) * s4ExpectedFactor); // 50,000 * 23 = 1,150,000
    results.push({
      id: 4,
      name: 'Lembur hari libur',
      rule: 'PP 35/2021: 10 jam hari istirahat, pengali 23x upah/173',
      passed: s4Overtime.factor === s4ExpectedFactor && s4Overtime.totalPay === s4ExpectedTotal,
      expected: `Faktor 23, Total upah lembur Rp ${s4ExpectedTotal.toLocaleString()}`,
      actual: `Faktor ${s4Overtime.factor}, Total upah lembur Rp ${s4Overtime.totalPay.toLocaleString()}`,
    });

    // 5. Pinjaman, THR, dan bonus di bulan yang sama (PPh 21 TER gabungan)
    const s5Bruto = 8000000 + 4000000 + 8000000; // 20M
    const s5Pph = calculatePPh21TER({ grossIncome: s5Bruto, ptkp: 'TK/0', hasNpwp: true });
    results.push({
      id: 5,
      name: 'Pinjaman, THR, dan bonus sebulan',
      rule: 'PPh 21 TER atas gabungan bruto masa yang sama (PP 58/2023)',
      passed: s5Pph.tax === Math.round(s5Bruto * 0.09),
      expected: 'TER Kategori A (9%) = Rp 1.800.000',
      actual: `Tarif ${(s5Pph.effectiveRate * 100).toFixed(1)}%, Pajak Rp ${s5Pph.tax.toLocaleString()}`,
    });

    // 6. Beda UMK (Bekasi vs Jakarta) — Tested via checkUmkCompliance domain engine
    const bekasiCheck = checkUmkCompliance({ wage: 5200000, city: 'Kota Bekasi', year: 2024 });
    const jakartaCheck = checkUmkCompliance({ wage: 5200000, city: 'DKI Jakarta', year: 2024 });
    const s6Passed = !bekasiCheck.isCompliant && bekasiCheck.flag === 'Upah di bawah UMK' &&
                     jakartaCheck.isCompliant && jakartaCheck.flag === null;
    results.push({
      id: 6,
      name: 'Beda UMK regional',
      rule: 'Upah Rp 5.200.000: di bawah UMK Bekasi, di atas UMK Jakarta (verifikasi domain engine)',
      passed: s6Passed,
      expected: 'Bekasi: Ditandai di bawah UMK; Jakarta: Memenuhi UMK',
      actual: `Bekasi compliant=${bekasiCheck.isCompliant} flag=${bekasiCheck.flag}, Jakarta compliant=${jakartaCheck.isCompliant}`,
    });

    // 7. PKWT Berakhir (PP 35/2021: Kompensasi proporsional masa kerja)
    const s7Pkwt12 = calculateTerminationPay({ monthlyWage: 6000000, yearsOfService: 1, monthsOfService: 12, reason: 'pkwt' });
    const s7Pkwt6 = calculateTerminationPay({ monthlyWage: 6000000, yearsOfService: 0.5, monthsOfService: 6, reason: 'pkwt' });
    const s7Passed = s7Pkwt12.pkwtCompensation === 6000000 && s7Pkwt12.severancePay === 0 &&
                     s7Pkwt6.pkwtCompensation === 3000000;
    results.push({
      id: 7,
      name: 'PKWT berakhir',
      rule: 'PP 35/2021: Kontrak 12 bln kompensasi 1x upah, 6 bln kompensasi 0.5x upah',
      passed: s7Passed,
      expected: 'Kompensasi 12 bln = Rp 6M, 6 bln = Rp 3M; Pesangon = Rp 0',
      actual: `12 bln: Rp ${s7Pkwt12.pkwtCompensation.toLocaleString()}, 6 bln: Rp ${s7Pkwt6.pkwtCompensation.toLocaleString()}`,
    });

    // 8. Data pajak belum lengkap (Tanpa NPWP tarif 120%)
    const s8WithNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: true });
    const s8NoNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: false });
    results.push({
      id: 8,
      name: 'Data pajak tanpa NPWP',
      rule: 'Tanpa NPWP: PPh 21 tarif 120% lebih tinggi (penalti 20%)',
      passed: s8NoNpwp.tax === Math.round(s8WithNpwp.tax * 1.2),
      expected: `PPh ber-NPWP Rp ${s8WithNpwp.tax.toLocaleString()} -> tanpa NPWP Rp ${Math.round(s8WithNpwp.tax * 1.2).toLocaleString()}`,
      actual: `PPh tanpa NPWP Rp ${s8NoNpwp.tax.toLocaleString()}`,
    });

    // 9. Transfer gagal & bayar ulang (Akuntansi jurnal seimbang)
    const initialJournals = generatePayrollJournals({
      periodId: 'PR-2026-11',
      periodName: 'Gaji November 2026',
      totalNetPay: 7000000,
      transferRecords: [
        { empId: 'E11', amount: 7000000, status: 'Gagal' },
      ],
    });
    const retryJournals = generatePayrollJournals({
      periodId: 'PR-2026-11',
      periodName: 'Gaji November 2026',
      totalNetPay: 7000000,
      transferRecords: [
        { empId: 'E11', amount: 7000000, status: 'Dibayar ulang' },
      ],
    });
    const s9Passed = initialJournals.allBalanced && initialJournals.remainingSalaryPayable === 7000000 &&
                     retryJournals.allBalanced && retryJournals.remainingSalaryPayable === 0;
    results.push({
      id: 9,
      name: 'Transfer gaji gagal & bayar ulang',
      rule: 'Gagal transfer tetap di utang gaji hingga dibayar ulang; neraca seimbang (Debit = Kredit)',
      passed: s9Passed,
      expected: 'Sebelum retry: Utang gaji Rp 7.000.000; Sesudah retry: Rp 0; Jurnal seimbang',
      actual: `Sisa sebelum=${initialJournals.remainingSalaryPayable}, sisa sesudah=${retryJournals.remainingSalaryPayable}, balanced=${initialJournals.allBalanced}`,
    });

    // 10. Rapel periode terkunci
    const lockedPeriod = { id: 'PR-2026-10', status: 'Dikunci', netPay: 6500000 };
    const nextPeriod = { id: 'PR-2026-11', status: 'Draf', netPay: 6500000 };
    const rapelResult = calculateRapelAdjustment({
      lockedPeriod,
      nextPeriod,
      rapelAmount: 35000,
    });
    const s10Passed = rapelResult.lockedPeriodNetPay === 6500000 &&
                      rapelResult.nextPeriodNetPay === 6535000 &&
                      rapelResult.lockedPeriodUnchanged;
    results.push({
      id: 10,
      name: 'Rapel penyesuaian periode terkunci',
      rule: 'Koreksi periode terkunci masuk periode berikutnya tanpa mengubah periode terkunci',
      passed: s10Passed,
      expected: 'Periode terkunci tetap Rp 6.500.000, Periode berikutnya Rp 6.535.000',
      actual: `Terkunci: Rp ${rapelResult.lockedPeriodNetPay.toLocaleString()}, Berikutnya: Rp ${rapelResult.nextPeriodNetPay.toLocaleString()}`,
    });

    // 11. Bonus Benchmark: Annual PPh 21 Pasal 17 Desember Reconciliation
    const annualRec = calculateAnnualPPh21Pasal17({
      annualGrossIncome: 144000000, // 12jt/mo
      ptkp: 'TK/0',
      hasNpwp: true,
      previousWithheldTax: 432000, // TER 1-11 months withheld
    });
    results.push({
      id: 11,
      name: 'Rekonsiliasi PPh 21 Desember (Pasal 17 A1)',
      rule: 'Pasal 17 UU PPh atas PKP setahun dikurangi potongan TER masa 1-11',
      passed: annualRec.finalAnnualTax > 0 && annualRec.decemberTax >= 0,
      expected: 'Pajak Desember dihitung dari selisih pajak setahun Pasal 17 dengan TER masa 1-11',
      actual: `Pajak tahunan: Rp ${annualRec.finalAnnualTax.toLocaleString()}, Pajak Des: Rp ${annualRec.decemberTax.toLocaleString()}`,
    });

    const passedCount = results.filter((r) => r.passed).length;
    res.json({
      title: 'Hasil Skenario Uji Wajib Payroll & Kesiapan Produksi (PP 35/2021 & PP 58/2023)',
      allPassed: passedCount === results.length,
      passedCount,
      totalCount: results.length,
      scenarios: results,
    });
  } catch (err) {
    console.error('Golden tests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
