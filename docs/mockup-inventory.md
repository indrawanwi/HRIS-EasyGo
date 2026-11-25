# HRIS EasyGo — Mockup Inventory & Architecture Map

> **Reference File**: `HRIS-EasyGo-Mockup-v6.3.html` (Version 6.3 — 23 Nov 2026)  
> **Source lines**: ~20,267 lines of code and inline CSS/JS  
> **Target Stack**: Node.js / Express REST API (`/api/v1`), Neon PostgreSQL, Modular Domain Engines  

---

## 1. Master Data Entities (6 Groups)

### Group 1: Organisasi (Organization)
1. **Direktorat (`ORG.dir`)**:
   - `DR-01`: Direktorat Operasional
   - `DR-02`: Direktorat Keuangan & SDM
   - `DR-03`: Direktorat Teknologi
2. **Departemen (`ORG.dep`)**:
   - `DP-01`: Fleet Operations (`DR-01`)
   - `DP-02`: Control Room (`DR-01`)
   - `DP-03`: Human Capital (`DR-02`)
   - `DP-04`: Finance & Accounting (`DR-02`)
   - `DP-05`: Engineering (`DR-03`)
3. **Unit Kerja (`ORG.unit`)**:
   - `UN-01`: Instalasi GPS Jakarta (`DP-01`)
   - `UN-02`: Instalasi GPS Bekasi (`DP-01`)
   - `UN-03`: Monitoring 24 jam (`DP-02`)
   - `UN-04`: HR Operations (`DP-03`)
   - `UN-05`: Payroll & HRIS (`DP-03`)
   - `UN-06`: Treasury (`DP-04`)
   - `UN-07`: Mobile Apps (`DP-05`)
4. **Grade (`ORG.grade`)**:
   - `GR-01`: Staff (Level 1)
   - `GR-02`: Senior staff (Level 2)
   - `GR-03`: Supervisor (Level 3)
   - `GR-04`: Manager (Level 4)
   - `GR-05`: Direktur (Level 5)
5. **Jabatan (`ORG.jab`)**:
   - Master positions linked to departments and grades.
   - Field employee flag (`lapangan: true`) assigned to field technicians (e.g. "Teknisi instalasi GPS", "Koordinator lapangan").

### Group 2: Jadwal Kerja (Work Schedules)
6. **Pola Kerja (`ORG.pola`)**:
   - `PJ-01`: Reguler kantor (Mon-Fri 08:00 - 17:00)
   - `PJ-02`: Shift pagi lapangan (Mon-Sat 07:00 - 15:00)
   - `PJ-03`: Shift malam control room (Everyday rotation 23:00 - 07:00)
7. **Jadwal Kerja (`ORG.jadwal`)**:
   - `JD-01`: Kantor pusat Kemayoran (`PJ-01`)
   - `JD-02`: Tim instalasi lapangan (`PJ-02`)
   - `JD-03`: Control room rotasi malam (`PJ-03`)

### Group 3: Karyawan & Cuti (Employees & Leaves)
8. **Karyawan (`EMP`)**:
   - Comprehensive employee record with NIK, full name, position, org units, schedule, direct manager, join date, phone, tax/BPJS IDs.
9. **Kontrak Kerja (`KONTRAK`)**:
   - Contract types: PKWTT (Permanent), PKWT (Fixed-term), Internship, Probation.
10. **Jenis Cuti (`REF.jc`)**:
    - `JC-01`: Cuti tahunan (Deducts annual quota)
    - `JC-02`: Cuti sakit (Retroactive limit 7 days, requires doctor certificate)
    - `JC-03`: Cuti melahirkan (3 months)
    - `JC-04`: Cuti besar (Long service leave)
    - `JC-05`: Izin keperluan keluarga
11. **Kuota Cuti (`KUOTA`)**:
    - Year-specific allowances per employee with rollover rules.

### Group 4: Pengguna & Peran (Users & Roles)
12. **Pengguna (`USERS`)**:
    - Web and mobile access credentials, assigned roles, activation state (`Aktif`, `Menunggu aktivasi`, `Nonaktif`).
13. **Peran (`ROLES`)**:
    - `super`: Super Admin
    - `karyawan`: Standard employee
    - `baru`: Onboarding new hire
    - `atasan`: Direct supervisor / manager
    - `hr`: HR Manager / HR Officer
    - `finance`: Finance & Accounting
    - `admin`: Departmental / Unit admin
    - `direksi`: Directors
    - `owner`: Business owner

### Group 5: Keuangan (Finance)
14. **Bank (`REF.bank`)**:
    - BCA (014), Mandiri (008), BNI (009), BRI (002), BSI (451), CIMB Niaga (022), Permata (013), Danamon (011), BTN (200).
15. **Metode Pembayaran (`REF.cc`)**:
    - `CC-01`: Transfer (rekening payroll)
    - `CC-02`: Tunai (kasir)
    - `CC-03`: E-wallet
16. **Item Biaya (`REF.jrb`)**:
    - Expense lines with standard Chart of Accounts (COA): BBM (6111), Tol (6112), Parkir (6113), Pengobatan (6211), Pulsa (6311), etc.
17. **Jenis Aktivitas (`REF.akt`)**:
    - `AK-01` to `AK-08`: Out-of-town trips, field duty, project operations, medical, communication.

### Group 6: Referensi Lain (Other References)
18. **Jenis Dokumen (`REF.jdk`)**:
    - Employment letter, income statement, paklaring, visa support letter.
19. **Kota Operasional (`REF.kota`)**:
    - Jakarta, Bekasi, Tangerang, Depok, Bogor, Surabaya, Bandung, etc.
20. **Tujuan Pinjaman (`REF.pintuj`)**:
    - Keperluan darurat, renovasi rumah, pendidikan keluarga, pengobatan keluarga.
21. **Kebijakan Klaim (`REF.claim_policies`)**:
    - Monthly spending caps per grade/position and category.

---

## 2. Request & Approval Workflows (`DATA`)

The application unifies 6 core request types under a common lifecycle state machine:
- **Cuti (Leave)**: Quota check, working day calculation, anti-overlap validation.
- **Lembur (Overtime)**: Max 4 hrs/day, 18 hrs/week per PP 35/2021; overnight calculation.
- **Uang Muka (Cash Advance)**: Upfront expense budget, settles via Pertanggungjawaban.
- **Reimburse**: Claim expenses paid out-of-pocket, policy ceiling enforcement.
- **Pinjaman (Loan)**: Interest-free installment plan, max salary multiplier.
- **Dokumen (Document Request)**: HR issuance of official letters.

**Approval Hierarchy**:
1. Atasan Langsung (Direct Supervisor)
2. Penyetuju Tambahan (Optional Unit Head / Director)
3. HR Review & Approval
4. Finance Disbursement (for monetary transactions)

**Integrity Rule**: Anti-Self-Approval is strictly enforced. No manager or officer may approve their own request; requests auto-escalate to a designated surrogate.

---

## 3. Payroll Calculation Engine

### Key Formulae:
- **Hourly Base**: `Upah / 173` (where Upah = Basic Salary + Fixed Allowances)
- **Overtime Multipliers (PP 35/2021)**:
  - Working Day: First hour = 1.5x, following hours = 2.0x
  - Rest Day / Holiday (5-day pattern): First 8 hrs = 2.0x, 9th hr = 3.0x, 10th+ hr = 4.0x
  - Rest Day / Holiday (6-day pattern): First 7 hrs = 2.0x, 8th hr = 3.0x, 9th+ hr = 4.0x
- **BPJS Kesehatan**:
  - Employer: 4%, Employee: 1%, Max monthly wage cap: Rp 12,000,000
- **BPJS Ketenagakerjaan**:
  - JHT: Employer 3.7%, Employee 2.0%
  - JP (Pensiun): Employer 2.0%, Employee 1.0%, Max monthly wage cap: Rp 10,042,300
  - JKK: Employer 0.24% - 1.74% (default 0.24% or 0.89%)
  - JKM: Employer 0.30%
- **PPh 21 TER (PP 58/2023)**:
  - Category A: TK/0, TK/1, K/0
  - Category B: TK/2, TK/3, K/1, K/2
  - Category C: K/3
  - Without NPWP/NIK: Rate multiplier is 120% (20% penalty)
