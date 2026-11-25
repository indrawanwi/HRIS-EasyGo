# Milestone Progress Tracker — HRIS EasyGo

| Milestone | Scope | Status | Verification Gate |
|---|---|:---:|---|
| **M0** | Mockup Audit, Neon Provisioning, DB Bootstrap, Docs Suite | **COMPLETED** | `npm run test:neon` passes; tables initialized |
| **M1** | Design Tokens, Auth System, Sessions, App Shell, Next.js Setup | **COMPLETED** | `tokens.css`, `AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx` |
| **M2** | Master Data UI (21 Tables), Drizzle ORM, Atomic Transactions | **COMPLETED** | `src/app/master/page.tsx`, Drizzle CRUD API, `db.transaction()` |
| **M3** | Employee Directory, Detail Profile & Neon Storage Photo Upload | **COMPLETED** | `src/app/employees/page.tsx`, `[id]/page.tsx`, `/api/upload` |
| **M4** | Recruitment (FPTK), Candidate Evaluation & Onboarding Flows | **COMPLETED** | `src/app/recruitment/page.tsx`, Pipeline, Locked Sequential Checklist |
| **M5** | Attendance, GPS Geofencing, Timesheet Entry & FTW | **COMPLETED** | `src/app/attendance/page.tsx`, GPS math, Geofence radius match |
| **M6** | Leave Request Overlap Validation, Overtime PP 35/2021 & Approval | **COMPLETED** | `src/app/requests/page.tsx`, Anti-Self-Approval, Overlap rejection |
| **M7** | Payroll Engine UI, Batch Calculation, PPh 21 TER, 10 Golden Tests | **COMPLETED** | `src/app/payroll/page.tsx`, **10 Golden Scenarios 100% Pass** |
| **M8** | Production Hardening, Audit Trail, RBAC Matrix & Vercel Prep | **COMPLETED** | `src/app/audit/page.tsx`, `next build` (21 routes), Playwright E2E 9/9 |
