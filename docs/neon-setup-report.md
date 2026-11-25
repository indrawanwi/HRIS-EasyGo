# Neon Cloud Setup & Verification Report

- **Date**: 24 November 2026
- **Organization ID**: `org-quiet-lab-09209946`
- **Project ID**: `curly-lab-40482145`
- **Active Branch**: `main` (Branch ID: `br-late-hat-be12vjwg`)
- **Host Endpoint**: `ep-divine-union-bemb79t1-pooler.c-9.us-east-2.aws.neon.tech`
- **SSL Security Mode**: `require` / TLS encrypted over pooled connection

## Verification Checks

1. **Database Ping**:
   - Connection established with SSL.
   - `SELECT 1 AS result` returned `1`.
2. **Schema & Table Initialization**:
   - Automated migration script created full relational schemas covering employees, master data, requests, approvals, attendance, job orders, and payroll.
3. **Data Seeding**:
   - Loaded complete baseline data extracted from `HRIS-EasyGo-Mockup-v6.3.html`:
     - 11 initial employees (E01 - E11)
     - Full organizational hierarchy (Directorates, Departments, Units, Grades, Schedules)
     - Complete financial Chart of Accounts & activities
     - Standard Indonesian payroll configuration & statutory tax tables
