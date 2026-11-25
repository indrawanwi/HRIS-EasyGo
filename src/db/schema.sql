-- =====================================================================
-- HRIS EasyGo — Relational Database Schema (Neon PostgreSQL)
-- =====================================================================

-- 1. Users, Auth & Auditing
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  roles JSONB NOT NULL DEFAULT '["karyawan"]'::jsonb,
  access JSONB NOT NULL DEFAULT '["web"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  payload JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Master Data: Organization
CREATE TABLE IF NOT EXISTS directorates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  directorate_id VARCHAR(50) REFERENCES directorates(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id VARCHAR(50) REFERENCES departments(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS grades (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) UNIQUE NOT NULL,
  department_id VARCHAR(50),
  grade_id VARCHAR(50),
  is_field_worker BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 3. Master Data: Work Schedules & Patterns
CREATE TABLE IF NOT EXISTS work_patterns (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  work_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  clock_in VARCHAR(10) NOT NULL,
  clock_out VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  pattern_id VARCHAR(50) REFERENCES work_patterns(id),
  effective_date DATE NOT NULL,
  description TEXT
);

-- 4. Master Data: Finance & References
CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  source_type VARCHAR(20),
  description TEXT
);

CREATE TABLE IF NOT EXISTS expense_items (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  coa_code VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_advance_allowed BOOLEAN NOT NULL DEFAULT true,
  is_reimburse_allowed BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS leave_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  has_quota BOOLEAN NOT NULL DEFAULT false,
  default_days INT NOT NULL DEFAULT 0,
  max_retroactive_days INT DEFAULT 0
);

-- 5. Employees & Contracts
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  nik VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  position_title VARCHAR(255) NOT NULL,
  directorate_id VARCHAR(50),
  department_id VARCHAR(50),
  unit_id VARCHAR(50),
  grade_id VARCHAR(50),
  schedule_id VARCHAR(50),
  manager_id VARCHAR(50),
  join_date DATE NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255) UNIQUE NOT NULL,
  ktp VARCHAR(50),
  npwp VARCHAR(50),
  ptkp VARCHAR(20) DEFAULT 'TK/0',
  bpjs_kes VARCHAR(50),
  bpjs_tk VARCHAR(50),
  bank_name VARCHAR(50),
  bank_account VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  contract_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  basic_salary NUMERIC(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_quotas (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id VARCHAR(50) REFERENCES leave_types(id),
  year INT NOT NULL,
  allocated_days INT NOT NULL DEFAULT 12,
  used_days INT NOT NULL DEFAULT 0,
  remaining_days INT NOT NULL DEFAULT 12,
  CONSTRAINT chk_remaining_non_negative CHECK (remaining_days >= 0),
  UNIQUE(emp_id, leave_type_id, year)
);

-- 6. Attendance, Timesheets & Fit To Work
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in VARCHAR(10),
  clock_out VARCHAR(10),
  location_in VARCHAR(255),
  coords_in VARCHAR(100),
  photo_in TEXT,
  location_out VARCHAR(255),
  coords_out VARCHAR(100),
  photo_out TEXT,
  match_status VARCHAR(50) DEFAULT 'Match',
  fit_to_work_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  activity TEXT NOT NULL,
  notes TEXT,
  coords VARCHAR(100),
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fit_to_work (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_fit BOOLEAN NOT NULL DEFAULT true,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer_id VARCHAR(50),
  decision VARCHAR(50) DEFAULT 'Approved',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Requests, Approvals & Financial Disbursements
CREATE TABLE IF NOT EXISTS requests (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- cuti, lembur, um, rb, pin, dk
  status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Atasan', -- Draf, Menunggu Atasan, Menunggu HR, Menunggu Pembayaran, Disetujui, Ditolak, Selesai
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS approval_routes (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50) REFERENCES requests(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  approver_role VARCHAR(50) NOT NULL,
  approver_id VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'Menunggu', -- Menunggu, Disetujui, Ditolak, Revisi
  comments TEXT,
  acted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS disbursements (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) REFERENCES requests(id),
  emp_id VARCHAR(50) REFERENCES employees(id),
  amount NUMERIC(15,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Pencairan',
  proof_url TEXT,
  disbursed_by VARCHAR(50),
  disbursed_at TIMESTAMPTZ
);

-- 8. Operations: Job Orders, Recruitment, Onboarding
CREATE TABLE IF NOT EXISTS job_orders (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  emp_id VARCHAR(50) REFERENCES employees(id),
  city VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Ditetapkan', -- Ditetapkan, Sedang Berjalan, Selesai
  checkin_photo TEXT,
  checkin_coords VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fptk_requests (
  id VARCHAR(50) PRIMARY KEY,
  position_title VARCHAR(255) NOT NULL,
  department_id VARCHAR(50),
  requested_count INT NOT NULL DEFAULT 1,
  reason TEXT,
  min_salary NUMERIC(15,2),
  max_salary NUMERIC(15,2),
  status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Direktur',
  director_decision VARCHAR(50),
  owner_decision VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(50) PRIMARY KEY,
  fptk_id VARCHAR(50) REFERENCES fptk_requests(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  stage VARCHAR(50) NOT NULL DEFAULT 'Screening',
  offering_salary NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
  step_name VARCHAR(255) NOT NULL,
  step_order INT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- 9. Training, SOP, Appraisal
CREATE TABLE IF NOT EXISTS training_modules (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  passing_grade INT NOT NULL DEFAULT 80
);

CREATE TABLE IF NOT EXISTS training_attempts (
  id SERIAL PRIMARY KEY,
  module_id VARCHAR(50) REFERENCES training_modules(id),
  emp_id VARCHAR(50) REFERENCES employees(id),
  score INT NOT NULL,
  is_passed BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sops (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  department_id VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sop_acknowledgements (
  id SERIAL PRIMARY KEY,
  sop_id VARCHAR(50) REFERENCES sops(id),
  emp_id VARCHAR(50) REFERENCES employees(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_appraisals (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) REFERENCES employees(id),
  period VARCHAR(50) NOT NULL,
  manager_score NUMERIC(5,2),
  peer_score NUMERIC(5,2),
  hr_score NUMERIC(5,2),
  final_score NUMERIC(5,2),
  status VARCHAR(50) NOT NULL DEFAULT 'Draf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Payroll Engine & Calculation History
CREATE TABLE IF NOT EXISTS payroll_periods (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  period_type VARCHAR(50) NOT NULL DEFAULT 'Gaji bulanan', -- Gaji bulanan, Bonus dan insentif
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draf', -- Draf, Dihitung, Diperiksa, Disetujui, Dibayar, Dikunci
  preparer_id VARCHAR(50),
  reviewer_id VARCHAR(50),
  approver_id VARCHAR(50),
  disburser_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id VARCHAR(50) PRIMARY KEY,
  period_id VARCHAR(50) REFERENCES payroll_periods(id) ON DELETE CASCADE,
  emp_id VARCHAR(50) REFERENCES employees(id),
  basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_company NUMERIC(15,2) NOT NULL DEFAULT 0,
  pph21 NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  calculation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
