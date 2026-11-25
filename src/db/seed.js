require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('./connection');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('🔄 Applying schema to Neon PostgreSQL...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ Schema created successfully.');

    console.log('🌱 Seeding Master Data...');

    // 1. Directorates
    await client.query(`
      INSERT INTO directorates (id, name, name_en) VALUES
      ('DR-01', 'Direktorat Operasional', 'Operations Directorate'),
      ('DR-02', 'Direktorat Keuangan & SDM', 'Finance & HR Directorate'),
      ('DR-03', 'Direktorat Teknologi', 'Technology Directorate')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Departments
    await client.query(`
      INSERT INTO departments (id, name, directorate_id) VALUES
      ('DP-01', 'Fleet Operations', 'DR-01'),
      ('DP-02', 'Control Room', 'DR-01'),
      ('DP-03', 'Human Capital', 'DR-02'),
      ('DP-04', 'Finance & Accounting', 'DR-02'),
      ('DP-05', 'Engineering', 'DR-03')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Units
    await client.query(`
      INSERT INTO units (id, name, department_id) VALUES
      ('UN-01', 'Instalasi GPS Jakarta', 'DP-01'),
      ('UN-02', 'Instalasi GPS Bekasi', 'DP-01'),
      ('UN-03', 'Monitoring 24 jam', 'DP-02'),
      ('UN-04', 'HR Operations', 'DP-03'),
      ('UN-05', 'Payroll & HRIS', 'DP-03'),
      ('UN-06', 'Treasury', 'DP-04'),
      ('UN-07', 'Mobile Apps', 'DP-05')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Grades
    await client.query(`
      INSERT INTO grades (id, name, level) VALUES
      ('GR-01', 'Staff', 1),
      ('GR-02', 'Senior staff', 2),
      ('GR-03', 'Supervisor', 3),
      ('GR-04', 'Manager', 4),
      ('GR-05', 'Direktur', 5)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Positions
    await client.query(`
      INSERT INTO positions (title, department_id, grade_id, is_field_worker) VALUES
      ('Direktur Keuangan & SDM', 'DP-03', 'GR-05', false),
      ('Direktur Operasional', 'DP-01', 'GR-05', false),
      ('Head of Fleet Operations', 'DP-01', 'GR-04', false),
      ('Teknisi instalasi GPS', 'DP-01', 'GR-02', true),
      ('Operator control room', 'DP-02', 'GR-01', false),
      ('Koordinator lapangan', 'DP-01', 'GR-03', true),
      ('HR Manager', 'DP-03', 'GR-04', false),
      ('Finance & Accounting Manager', 'DP-04', 'GR-04', false),
      ('Payroll Specialist', 'DP-03', 'GR-02', false),
      ('Super Admin', 'DP-03', 'GR-05', false)
      ON CONFLICT (title) DO NOTHING;
    `);

    // 6. Work Patterns & Schedules
    await client.query(`
      INSERT INTO work_patterns (id, name, name_en, work_days, clock_in, clock_out) VALUES
      ('PJ-01', 'Reguler kantor', 'Regular office hours', '[1, 2, 3, 4, 5]', '08:00', '17:00'),
      ('PJ-02', 'Shift pagi lapangan', 'Field morning shift', '[1, 2, 3, 4, 5, 6]', '07:00', '15:00'),
      ('PJ-03', 'Shift malam control room', 'Control room night shift', '[1, 2, 3, 4, 5, 6, 0]', '23:00', '07:00')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO work_schedules (id, name, pattern_id, effective_date, description) VALUES
      ('JD-01', 'Kantor pusat Kemayoran 2026', 'PJ-01', '2026-01-01', 'Staf kantor dan manajemen'),
      ('JD-02', 'Tim instalasi lapangan 2026', 'PJ-02', '2026-01-01', 'Teknisi, koordinator lapangan, operator pagi'),
      ('JD-03', 'Control room rotasi malam', 'PJ-03', '2026-07-01', 'Operator monitoring bergiliran')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Banks, Payment methods, Expense items, Leave types
    await client.query(`
      INSERT INTO banks (name, code) VALUES
      ('BCA', '014'), ('Bank Mandiri', '008'), ('BNI', '009'),
      ('BRI', '002'), ('BSI', '451'), ('CIMB Niaga', '022')
      ON CONFLICT DO NOTHING;

      INSERT INTO payment_methods (id, name, name_en, source_type, description) VALUES
      ('CC-01', 'Transfer', 'Bank transfer', 'rek', 'Ke rekening payroll karyawan'),
      ('CC-02', 'Tunai', 'Cash', '', 'Diambil di kasir kantor pusat'),
      ('CC-03', 'E-wallet', 'E-wallet', 'ew', 'Ke akun e-wallet karyawan')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO expense_items (id, name, name_en, coa_code) VALUES
      ('JR-01', 'BBM', 'Fuel', '6111'),
      ('JR-07', 'Tol', 'Tolls', '6112'),
      ('JR-02', 'Parkir', 'Parking', '6113'),
      ('JR-06', 'Transportasi umum', 'Public transport', '6114'),
      ('JR-10', 'Tiket pesawat/kereta', 'Flight/train ticket', '6115'),
      ('JR-08', 'Hotel', 'Hotel', '6121'),
      ('JR-09', 'Makan dan konsumsi', 'Meals', '6131'),
      ('JR-04', 'Makan lembur', 'Overtime meal', '6132'),
      ('JR-03', 'Pengobatan', 'Medical', '6211'),
      ('JR-05', 'Pulsa & data', 'Phone & data', '6311')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO leave_types (id, name, name_en, has_quota, default_days, max_retroactive_days) VALUES
      ('JC-01', 'Cuti tahunan', 'Annual leave', true, 12, 0),
      ('JC-02', 'Cuti sakit', 'Sick leave', false, 0, 7),
      ('JC-03', 'Cuti melahirkan', 'Maternity leave', false, 90, 0),
      ('JC-04', 'Cuti besar', 'Long service leave', true, 22, 0),
      ('JC-05', 'Izin keperluan keluarga', 'Family matters leave', false, 3, 0)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Employees (All 11 from mockup)
    const employees = [
      ['E01', '20110302', 'Wulan Kusumawati', 'Direktur Keuangan & SDM', 'DR-02', 'DP-03', 'UN-04', 'GR-05', 'JD-01', null, '2011-03-14', '0811-1820-4471', 'wulan.kusumawati@easygo-gps.co.id', 'K/2', 25000000],
      ['E02', '20100518', 'Bambang Hartono', 'Direktur Operasional', 'DR-01', 'DP-01', 'UN-01', 'GR-05', 'JD-01', null, '2010-05-03', '0811-9012-3388', 'bambang.hartono@easygo-gps.co.id', 'K/1', 25000000],
      ['E03', '20150811', 'Hendra Wijaya', 'Head of Fleet Operations', 'DR-01', 'DP-01', 'UN-01', 'GR-04', 'JD-01', 'E02', '2015-08-17', '0812-8890-1123', 'hendra.wijaya@easygo-gps.co.id', 'K/2', 15000000],
      ['E04', '20210904', 'Rizky Pratama', 'Teknisi instalasi GPS', 'DR-01', 'DP-01', 'UN-01', 'GR-02', 'JD-02', 'E03', '2021-09-06', '0813-1477-2290', 'rizky.pratama@easygo-gps.co.id', 'TK/0', 7500000],
      ['E05', '20220213', 'Agus Setiawan', 'Teknisi instalasi GPS', 'DR-01', 'DP-01', 'UN-02', 'GR-01', 'JD-02', 'E03', '2022-02-14', '0857-2210-6634', 'agus.setiawan@easygo-gps.co.id', 'TK/1', 6000000],
      ['E06', '20230120', 'Fitri Handayani', 'Operator control room', 'DR-01', 'DP-02', 'UN-03', 'GR-01', 'JD-02', 'E03', '2023-01-09', '0821-4455-0912', 'fitri.handayani@easygo-gps.co.id', 'TK/0', 5800000],
      ['E07', '20190706', 'Bayu Saputra', 'Koordinator lapangan', 'DR-01', 'DP-01', 'UN-01', 'GR-03', 'JD-02', 'E03', '2019-07-01', '0812-6601-7745', 'bayu.saputra@easygo-gps.co.id', 'K/1', 9500000],
      ['E08', '20170402', 'Sari Utami', 'HR Manager', 'DR-02', 'DP-03', 'UN-04', 'GR-04', 'JD-01', 'E01', '2017-04-10', '0811-2390-5521', 'sari.utami@easygo-gps.co.id', 'TK/0', 14000000],
      ['E09', '20180915', 'Rahmat Hidayat', 'Finance & Accounting Manager', 'DR-02', 'DP-04', 'UN-06', 'GR-04', 'JD-01', 'E01', '2018-09-17', '0813-5566-7788', 'rahmat.hidayat@easygo-gps.co.id', 'K/2', 14500000],
      ['E10', '20201103', 'Dimas Nugroho', 'Payroll Specialist', 'DR-02', 'DP-03', 'UN-05', 'GR-02', 'JD-01', 'E08', '2020-11-02', '0812-3344-5566', 'dimas.nugroho@easygo-gps.co.id', 'TK/1', 8000000],
      ['E11', '20100101', 'Tubaka', 'Super Admin', 'DR-03', 'DP-05', 'UN-07', 'GR-05', 'JD-01', null, '2010-01-01', '0811-0000-0001', 'superadmin@easygo-gps.co.id', 'K/0', 30000000]
    ];

    console.log('👤 Seeding Employees, Contracts, Quotas and Users...');
    const defaultPasswordHash = hashPassword('easygo123');

    for (const emp of employees) {
      const [id, nik, name, pos, dir, dep, unit, gr, sch, mgr, join, phone, email, ptkp, salary] = emp;
      await client.query(`
        INSERT INTO employees (
          id, nik, name, position_title, directorate_id, department_id, unit_id,
          grade_id, schedule_id, manager_id, join_date, phone, email, ptkp, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          position_title = EXCLUDED.position_title,
          email = EXCLUDED.email;
      `, [id, nik, name, pos, dir, dep, unit, gr, sch, mgr, join, phone, email, ptkp]);

      // Contract
      await client.query(`
        INSERT INTO contracts (id, emp_id, contract_type, start_date, basic_salary)
        VALUES ($1, $2, 'PKWTT', $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, ['CT-' + id, id, join, salary]);

      // Leave Quota for 2026
      await client.query(`
        INSERT INTO leave_quotas (emp_id, leave_type_id, year, allocated_days, used_days, remaining_days)
        VALUES ($1, 'JC-01', 2026, 12, 2, 10)
        ON CONFLICT (emp_id, leave_type_id, year) DO NOTHING;
      `, [id]);

      // Determine user roles
      let roles = ['karyawan'];
      if (id === 'E11') roles = ['super', 'admin'];
      else if (id === 'E08') roles = ['hr', 'karyawan', 'atasan'];
      else if (id === 'E09') roles = ['finance', 'karyawan', 'atasan'];
      else if (id === 'E03' || id === 'E07') roles = ['atasan', 'karyawan'];
      else if (id === 'E01' || id === 'E02') roles = ['direksi', 'atasan', 'karyawan'];

      await client.query(`
        INSERT INTO users (id, emp_id, name, email, password_hash, roles, access, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, '["web", "hp"]'::jsonb, true)
        ON CONFLICT (id) DO UPDATE SET
          roles = EXCLUDED.roles,
          password_hash = EXCLUDED.password_hash;
      `, ['US-' + id, id, name, email, defaultPasswordHash, JSON.stringify(roles)]);
    }

    // 9. Sample Attendance Record
    const today = new Date().toISOString().slice(0, 10);
    await client.query(`
      INSERT INTO attendance_records (id, emp_id, date, clock_in, clock_out, location_in, coords_in, match_status)
      VALUES
      ('AB-01', 'E04', $1, '06:55', '15:10', 'Kantor Pusat Kemayoran', '-6.160, 106.840', 'Match'),
      ('AB-02', 'E05', $1, '06:58', '15:05', 'Pool Instalasi Bekasi', '-6.230, 106.990', 'Match')
      ON CONFLICT (id) DO NOTHING;
    `, [today]);

    // 10. Sample Requests & Approval Routes
    await client.query(`
      INSERT INTO requests (id, emp_id, type, status, details, notes) VALUES
      ('RQ-01', 'E04', 'cuti', 'Disetujui', '{"jenis": "JC-01", "hari": 2, "mulai": "2026-12-01", "selesai": "2026-12-02"}'::jsonb, 'Cuti keluarga'),
      ('RQ-02', 'E04', 'lembur', 'Menunggu Atasan', '{"tgl": "2026-11-20", "jam": 3, "alasan": "Pemasangan 10 unit GPS fleet"}'::jsonb, 'Lembur instalasi urgent')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Sample Job Order for field tech Rizky
    await client.query(`
      INSERT INTO job_orders (id, code, title, emp_id, city, date, status, notes) VALUES
      ('JO-01', 'JO-2026-001', 'Instalasi GPS 5 Unit Truk Tronton PT Logistik Sejahtera', 'E04', 'Jakarta', $1, 'Ditetapkan', 'Bawa perlengkapan harness dan toolkit standar')
      ON CONFLICT (id) DO NOTHING;
    `, [today]);

    // 12. Training modules & SOP
    await client.query(`
      INSERT INTO training_modules (id, code, title, passing_grade) VALUES
      ('TR-01', 'TR-GPS-01', 'Prosedur Standard Instalasi GPS Tracker & Sensor Suhu', 80),
      ('TR-02', 'TR-K3-01', 'Keselamatan & Kesehatan Kerja Lapangan', 80)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO sops (id, code, title, version, department_id) VALUES
      ('SOP-01', 'SOP-OPS-001', 'Standar Operasional Kalibrasi Alat GPS', '2.0', 'DP-01'),
      ('SOP-02', 'SOP-HR-001', 'Panduan Pengajuan Cuti dan Lembur Karyawan', '1.1', 'DP-03')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO onboarding_steps (emp_id, step_name, step_order, is_completed, completed_at) VALUES
      ('E04', 'Pengambilan ID Card & Akses Fasilitas', 1, true, NOW() - INTERVAL '100 days'),
      ('E04', 'Serah Terima Toolkit & Perlengkapan GPS', 2, true, NOW() - INTERVAL '99 days'),
      ('E04', 'Briefing K3 & Pengenalan Lapangan', 3, true, NOW() - INTERVAL '98 days'),
      ('E05', 'Pengambilan ID Card & Akses Fasilitas', 1, true, NOW() - INTERVAL '50 days'),
      ('E05', 'Serah Terima Toolkit & Perlengkapan GPS', 2, true, NOW() - INTERVAL '49 days'),
      ('E05', 'Briefing K3 & Pengenalan Lapangan', 3, false, NULL)
      ON CONFLICT DO NOTHING;
    `);

    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSeed().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runSeed };
