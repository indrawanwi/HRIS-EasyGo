import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  serial,
} from 'drizzle-orm/pg-core';

// 1. Users, Sessions & Audit Logs
export const users = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  roles: jsonb('roles').default(['karyawan']),
  access: jsonb('access').default(['web']),
  isActive: boolean('is_active').default(true).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 500 }).unique().notNull(),
  userId: varchar('user_id', { length: 50 }).references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: varchar('entity_id', { length: 100 }),
  payload: jsonb('payload'),
  ipAddress: varchar('ip_address', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Master Data: Organization
export const directorates = pgTable('directorates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
});

export const departments = pgTable('departments', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  directorateId: varchar('directorate_id', { length: 50 }).references(() => directorates.id),
  isActive: boolean('is_active').default(true).notNull(),
});

export const units = pgTable('units', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  departmentId: varchar('department_id', { length: 50 }).references(() => departments.id),
  isActive: boolean('is_active').default(true).notNull(),
});

export const grades = pgTable('grades', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  level: integer('level').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).unique().notNull(),
  departmentId: varchar('department_id', { length: 50 }),
  gradeId: varchar('grade_id', { length: 50 }),
  isFieldWorker: boolean('is_field_worker').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// 3. Master Data: Work Schedules & Patterns
export const workPatterns = pgTable('work_patterns', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  workDays: jsonb('work_days').default([1, 2, 3, 4, 5]).notNull(),
  clockIn: varchar('clock_in', { length: 10 }).notNull(),
  clockOut: varchar('clock_out', { length: 10 }).notNull(),
});

export const workSchedules = pgTable('work_schedules', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  patternId: varchar('pattern_id', { length: 50 }).references(() => workPatterns.id),
  effectiveDate: date('effective_date').notNull(),
  description: text('description'),
});

// 4. Master Data: Finance & References
export const banks = pgTable('banks', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  sourceType: varchar('source_type', { length: 20 }),
  description: text('description'),
});

export const expenseItems = pgTable('expense_items', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  coaCode: varchar('coa_code', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const activities = pgTable('activities', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  items: jsonb('items').default([]).notNull(),
  isAdvanceAllowed: boolean('is_advance_allowed').default(true).notNull(),
  isReimburseAllowed: boolean('is_reimburse_allowed').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const leaveTypes = pgTable('leave_types', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  hasQuota: boolean('has_quota').default(false).notNull(),
  defaultDays: integer('default_days').default(0).notNull(),
  maxRetroactiveDays: integer('max_retroactive_days').default(0),
});

// 5. Employees, Contracts, Quotas
export const employees = pgTable('employees', {
  id: varchar('id', { length: 50 }).primaryKey(),
  nik: varchar('nik', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  positionTitle: varchar('position_title', { length: 255 }).notNull(),
  directorateId: varchar('directorate_id', { length: 50 }),
  departmentId: varchar('department_id', { length: 50 }),
  unitId: varchar('unit_id', { length: 50 }),
  gradeId: varchar('grade_id', { length: 50 }),
  scheduleId: varchar('schedule_id', { length: 50 }),
  managerId: varchar('manager_id', { length: 50 }),
  joinDate: date('join_date').notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  ktp: varchar('ktp', { length: 50 }),
  npwp: varchar('npwp', { length: 50 }),
  ptkp: varchar('ptkp', { length: 20 }).default('TK/0'),
  bpjsKes: varchar('bpjs_kes', { length: 50 }),
  bpjsTk: varchar('bpjs_tk', { length: 50 }),
  bankName: varchar('bank_name', { length: 50 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contracts = pgTable('contracts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  contractType: varchar('contract_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  basicSalary: numeric('basic_salary', { precision: 15, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leaveQuotas = pgTable('leave_quotas', {
  id: serial('id').primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: varchar('leave_type_id', { length: 50 }).references(() => leaveTypes.id),
  year: integer('year').notNull(),
  allocatedDays: integer('allocated_days').default(12).notNull(),
  usedDays: integer('used_days').default(0).notNull(),
  remainingDays: integer('remaining_days').default(12).notNull(),
});

// 6. Attendance & Timesheets
export const attendanceRecords = pgTable('attendance_records', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  clockIn: varchar('clock_in', { length: 10 }),
  clockOut: varchar('clock_out', { length: 10 }),
  locationIn: varchar('location_in', { length: 255 }),
  coordsIn: varchar('coords_in', { length: 100 }),
  photoIn: text('photo_in'),
  locationOut: varchar('location_out', { length: 255 }),
  coordsOut: varchar('coords_out', { length: 100 }),
  photoOut: text('photo_out'),
  matchStatus: varchar('match_status', { length: 50 }).default('Match'),
  fitToWorkStatus: varchar('fit_to_work_status', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const timesheets = pgTable('timesheets', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  activity: text('activity').notNull(),
  notes: text('notes'),
  coords: varchar('coords', { length: 100 }),
  proofUrl: text('proof_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fitToWork = pgTable('fit_to_work', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  isFit: boolean('is_fit').default(true).notNull(),
  answers: jsonb('answers').default({}).notNull(),
  reviewerId: varchar('reviewer_id', { length: 50 }),
  decision: varchar('decision', { length: 50 }).default('Approved'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Requests, Approvals & Disbursements
export const requests = pgTable('requests', {
  id: varchar('id', { length: 50 }).primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('Menunggu Atasan').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  details: jsonb('details').default({}).notNull(),
  notes: text('notes'),
});

export const approvalRoutes = pgTable('approval_routes', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).references(() => requests.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  approverRole: varchar('approver_role', { length: 50 }).notNull(),
  approverId: varchar('approver_id', { length: 50 }),
  status: varchar('status', { length: 50 }).default('Menunggu').notNull(),
  comments: text('comments'),
  actedAt: timestamp('acted_at', { withTimezone: true }),
});

export const disbursements = pgTable('disbursements', {
  id: varchar('id', { length: 50 }).primaryKey(),
  requestId: varchar('request_id', { length: 50 }).references(() => requests.id),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  method: varchar('method', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('Menunggu Pencairan').notNull(),
  proofUrl: text('proof_url'),
  disbursedBy: varchar('disbursed_by', { length: 50 }),
  disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
});

// 8. Operations, Job Orders & Recruitment
export const jobOrders = pgTable('job_orders', {
  id: varchar('id', { length: 50 }).primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id),
  city: varchar('city', { length: 100 }).notNull(),
  date: date('date').notNull(),
  status: varchar('status', { length: 50 }).default('Ditetapkan').notNull(),
  checkinPhoto: text('checkin_photo'),
  checkinCoords: varchar('checkin_coords', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fptkRequests = pgTable('fptk_requests', {
  id: varchar('id', { length: 50 }).primaryKey(),
  positionTitle: varchar('position_title', { length: 255 }).notNull(),
  departmentId: varchar('department_id', { length: 50 }),
  requestedCount: integer('requested_count').default(1).notNull(),
  reason: text('reason'),
  minSalary: numeric('min_salary', { precision: 15, scale: 2 }),
  maxSalary: numeric('max_salary', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 50 }).default('Menunggu Direktur').notNull(),
  directorDecision: varchar('director_decision', { length: 50 }),
  ownerDecision: varchar('owner_decision', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const candidates = pgTable('candidates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  fptkId: varchar('fptk_id', { length: 50 }).references(() => fptkRequests.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  stage: varchar('stage', { length: 50 }).default('Screening').notNull(),
  offeringSalary: numeric('offering_salary', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const onboardingSteps = pgTable('onboarding_steps', {
  id: serial('id').primaryKey(),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id, { onDelete: 'cascade' }),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  stepOrder: integer('step_order').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// 9. Payroll Periods & Items
export const payrollPeriods = pgTable('payroll_periods', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  periodType: varchar('period_type', { length: 50 }).default('Gaji bulanan').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  payDate: date('pay_date').notNull(),
  status: varchar('status', { length: 50 }).default('Draf').notNull(),
  preparerId: varchar('preparer_id', { length: 50 }),
  reviewerId: varchar('reviewer_id', { length: 50 }),
  approverId: varchar('approver_id', { length: 50 }),
  disburserId: varchar('disburser_id', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payrollItems = pgTable('payroll_items', {
  id: varchar('id', { length: 50 }).primaryKey(),
  periodId: varchar('period_id', { length: 50 }).references(() => payrollPeriods.id, { onDelete: 'cascade' }),
  empId: varchar('emp_id', { length: 50 }).references(() => employees.id),
  basicSalary: numeric('basic_salary', { precision: 15, scale: 2 }).default('0').notNull(),
  allowances: numeric('allowances', { precision: 15, scale: 2 }).default('0').notNull(),
  overtimePay: numeric('overtime_pay', { precision: 15, scale: 2 }).default('0').notNull(),
  deductions: numeric('deductions', { precision: 15, scale: 2 }).default('0').notNull(),
  bpjsEmployee: numeric('bpjs_employee', { precision: 15, scale: 2 }).default('0').notNull(),
  bpjsCompany: numeric('bpjs_company', { precision: 15, scale: 2 }).default('0').notNull(),
  pph21: numeric('pph21', { precision: 15, scale: 2 }).default('0').notNull(),
  netPay: numeric('net_pay', { precision: 15, scale: 2 }).default('0').notNull(),
  calculationDetails: jsonb('calculation_details').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
