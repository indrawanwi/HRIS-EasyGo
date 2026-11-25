# HRIS EasyGo — Production Backend & REST API

> **Reference Prototype**: `HRIS-EasyGo-Mockup-v6.3.html` (v6.3 — 23 Nov 2026)  
> **Database**: Neon Serverless PostgreSQL (`@neon/sdk`, `pg`)  
> **Backend**: Express.js REST API (`/api/v1`) with Modular Domain Engines  

---

## 🌟 Overview

HRIS EasyGo transforms the comprehensive 20,000-line standalone HRIS mockup into a production-grade, secure multi-tenant HRIS backend. It connects directly to **Neon PostgreSQL** and implements regulatory Indonesian labor compliance engines.

### Key Highlights
- **Full Relational Schema**: 21 master data tables, employees, contracts, attendance with GPS telemetry, multi-tier requests, approval routes, and payroll runs.
- **Strict Anti-Self-Approval & Duty Separation**: Enforces that no employee, manager, or director can approve their own requests; requires 4 distinct individuals for payroll lifecycle (Penyiap, Pemeriksa, Penyetuju, Pembayar).
- **Indonesian Regulatory Compliance**:
  - Overtime 1/173 hourly multiplier with daily (4h) & weekly (18h) caps per **PP 35/2021**.
  - Statutory PPh 21 TER Categories A, B, C per **PP 58/2023** with 120% penalty for unverified tax IDs.
  - BPJS Kesehatan (4% employer + 1% employee, Rp 12M cap) & BPJS TK (JHT, JP cap, JKK, JKM).
  - Severance, UPMK, and PKWT compensation calculations per **PP 35/2021**.
- **10 Golden Benchmark Scenarios**: 100% verified against statutory benchmark cases.

---

## 🚀 Quick Start

### 1. Requirements
- Node.js >= 18.0.0
- Neon PostgreSQL credentials in `.env.local`

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize & Seed Neon Database
```bash
npm run init-db
```
*Creates full schema and seeds 11 employees, org hierarchy, leave quotas, and chart of accounts.*

### 4. Run Automated Test Suite
```bash
# Run all unit and integration tests
npm test

# Run Neon Cloud PostgreSQL smoke tests
npm run test:neon

# Run 10 Golden Benchmark Scenarios
npm run test:payroll

# Run Leave, Overtime & Approval business rules
npm run test:rules
```

### 5. Start Development Server
```bash
npm run dev
# or npm start
```
- API Base URL: `http://localhost:3000/api/v1`
- Healthcheck: `http://localhost:3000/api/v1/health`
- Web Prototype: `http://localhost:3000/`

---

## 📚 API Endpoints (`/api/v1`)

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | Deployment status & Neon DB ping |
| **Auth** | `POST` | `/api/v1/auth/login` | Login with NIK/Email and password |
| **Auth** | `GET` | `/api/v1/me` | Current authenticated user & profile |
| **Employees** | `GET` | `/api/v1/employees` | List employees with filters |
| **Employees** | `POST` | `/api/v1/employees` | Atomic employee creation (with contract & quota) |
| **Master** | `GET` | `/api/v1/master/:entity` | Access any master table (e.g. `departments`) |
| **Attendance** | `POST` | `/api/v1/attendance/check-in` | Clock in with GPS coordinates and photo |
| **Requests** | `POST` | `/api/v1/requests` | Submit leave, overtime, claim, loan |
| **Approvals** | `GET` | `/api/v1/requests/approvals/pending` | Pending approval queue for user |
| **Approvals** | `POST` | `/api/v1/requests/approvals/:id/decide` | Approve/Reject with anti-self-approval |
| **Payroll** | `POST` | `/api/v1/payroll/calculate` | Run calculation engine for period |
| **Payroll** | `POST` | `/api/v1/payroll/golden-tests` | Run 10 Golden Scenarios verification |

---

## 📁 Repository Structure

```
├── docs/                      # Architecture & Verification Docs
│   ├── mockup-inventory.md    # Mapping of 21 master data entities & flows
│   ├── design-system.md       # Color tokens and layout specs
│   ├── decisions.md           # Architecture Decision Records (ADRs)
│   ├── progress.md            # Living milestone progress tracker
│   └── neon-setup-report.md   # Neon PostgreSQL provisioning report
├── src/
│   ├── db/
│   │   ├── connection.js      # Neon pg connection pool
│   │   ├── schema.sql         # Relational database DDL
│   │   └── seed.js            # Initial data migration & seeder
│   ├── features/
│   │   ├── payroll/engine/    # PPh 21 TER, BPJS & Overtime engine
│   │   ├── requests/rules/    # Leave & Overtime validation logic
│   │   └── approvals/         # Multi-stage routing & separation of duties
│   ├── routes/                # Express REST API route handlers
│   └── server.js              # Express app mounting routes & static assets
├── tests/                     # Automated test suite (node:test)
│   ├── neon-smoke.test.js
│   ├── payroll-golden.test.js
│   ├── leave-rules.test.js
│   ├── overtime-rules.test.js
│   ├── approval-engine.test.js
│   └── api-integration.test.js
└── HRIS-EasyGo-Mockup-v6.3.html # Standalone interactive mockup
```
