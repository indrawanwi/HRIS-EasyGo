import { test, expect } from '@playwright/test';

test.describe('HRIS EasyGo — E2E Critical User Journeys (Next.js 14 App Router)', () => {
  test('1. System Healthcheck & Neon Database Connectivity', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('UP');
    expect(data.database).toContain('Neon PostgreSQL');
    expect(data.timestampJakarta).toBeDefined();
  });

  test('2. Authentication Flow: Login with Seeded NIK and Redirect to Dashboard', async ({ page }) => {
    // Navigate to Login Page
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Masuk ke HRIS EasyGo');

    // Fill credentials for field technician Rizky Pratama (NIK 20210904)
    await page.locator('input[type="text"]').fill('20210904');
    await page.locator('input[type="password"]').fill('easygo123');
    await page.locator('button[type="submit"]').click();

    // Verify successful redirect to Dashboard
    await page.waitForURL('**/');
    await expect(page.locator('h1')).toContainText('Selamat Datang');
    await expect(page.locator('text=PT EasyGo GPS Indonesia')).toBeVisible();
    await expect(page.locator('text=Total Karyawan')).toBeVisible();
  });

  test('3. App Shell Navigation & Persona Switcher', async ({ page }) => {
    await page.goto('/');
    // Check real-time WIB Clock in header
    await expect(page.locator('text=WIB')).toBeVisible();

    // Select different persona from Header dropdown
    const personaSelect = page.locator('#persona-select');
    await expect(personaSelect).toBeVisible();
    await personaSelect.selectOption('E08'); // Switch to Sari Utami (HR Manager)

    // Verify localStorage updated and persona reflected
    const storedUser = await page.evaluate(() => localStorage.getItem('easygo_user'));
    expect(storedUser).toContain('E08');
  });

  test('4. Master Data Management: Entity Switching and Modal Form', async ({ page }) => {
    await page.goto('/master');
    await expect(page.locator('h1')).toContainText('Manajemen Data Master');

    // Verify entity tabs are present
    await expect(page.getByRole('button', { name: 'Departemen', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direktorat', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jabatan (Positions)', exact: true })).toBeVisible();

    // Switch to Golongan & Grade tab
    await page.getByRole('button', { name: 'Golongan & Grade', exact: true }).click();
    await expect(page.locator('th:has-text("Kode Grade")')).toBeVisible();

    // Click "Tambah" button and verify modal
    await page.locator('button:has-text("Tambah Golongan & Grade")').click();
    await expect(page.locator('.modal-card h3')).toContainText('Tambah Golongan & Grade Baru');
    await page.locator('.modal-header button').click(); // Close modal
  });

  test('5. Employee Directory: Search, View Switching & Profile Detail', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('h1')).toContainText('Direktori Karyawan');

    // Search for employee
    const searchInput = page.locator('input[placeholder*="Cari berdasarkan"]');
    await searchInput.fill('Rizky');
    await expect(page.locator('table').getByText('Rizky Pratama')).toBeVisible();

    // Switch to Card (Grid) view
    await page.locator('button:has-text("Kartu")').click();
    await expect(page.locator('text=Lihat & Kelola Profil').first()).toBeVisible();

    // Switch back to Table view and navigate to Detail Profile
    await page.locator('button:has-text("Tabel")').click();
    await page.goto('/employees/E04');
    await expect(page.locator('h1')).toContainText('Rizky Pratama');
    await expect(page.locator('text=Teknisi instalasi GPS')).toBeVisible();

    // Check tabs in Detail View
    await page.locator('button:has-text("Kontrak & Gaji")').click();
    await expect(page.locator('text=Riwayat Kontrak Kerja')).toBeVisible();

    await page.locator('button:has-text("Saldo Cuti (2026)")').click();
    await expect(page.locator('text=Alokasi & Sisa Kuota Cuti')).toBeVisible();

    await page.locator('button:has-text("BPJS & Rekening Bank")').click();
    await expect(page.locator('text=Kepesertaan Jaminan Sosial')).toBeVisible();
  });

  test('6. Attendance & GPS Geofencing Telemetry', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.locator('h1')).toContainText('Presensi, GPS & Timesheet');

    // Verify clock and geofence target
    await expect(page.locator('text=Kantor Pusat Kemayoran')).toBeVisible();

    // Trigger Clock-In
    await page.locator('button:has-text("Masuk (Clock In)")').click();
    await expect(page.locator('text=Clock-In Berhasil!')).toBeVisible({ timeout: 10000 });

    // Switch to Timesheet tab
    await page.locator('button:has-text("Isi Timesheet Kegiatan")').click();
    await expect(page.locator('h3:has-text("Input Lembar Kerja")')).toBeVisible();

    // Switch to Fit to Work tab
    await page.locator('button:has-text("Fit To Work (FTW)")').click();
    await expect(page.locator('h3:has-text("Deklarasi Kesehatan Harian")')).toBeVisible();
  });

  test('7. Requests Workflow: Leave Submission & Overlap Protection', async ({ page }) => {
    await page.goto('/requests');
    await expect(page.locator('h1')).toContainText('Permintaan & Alur Approval');

    // Go to Leave Form tab
    await page.locator('button:has-text("Formulir Cuti")').click();
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);

    // Dynamic unique date range in 2028 to guarantee fresh idempotency
    const randDay = 10 + Math.floor(Math.random() * 15);
    const testStart = `2028-05-${String(randDay).padStart(2, '0')}`;
    const testEnd = `2028-05-${String(randDay + 1).padStart(2, '0')}`;

    await startDateInput.fill(testStart);
    await endDateInput.fill(testEnd);
    await page.locator('button:has-text("Kirim Pengajuan Cuti")').click();

    // Verify feedback (success)
    await expect(page.locator('text=Pengajuan cuti berhasil dikirim!')).toBeVisible({ timeout: 10000 });

    // Attempt second submission with exact same dates -> must fail overlap validation
    await page.locator('button:has-text("Formulir Cuti")').click();
    await startDateInput.fill(testStart);
    await endDateInput.fill(testEnd);
    await page.locator('button:has-text("Kirim Pengajuan Cuti")').click();

    // Overlap error message
    await expect(page.locator('text=bertabrakan')).toBeVisible({ timeout: 10000 });
  });

  test('8. Payroll Engine: 10 Golden Benchmark Scenarios & December Reconciliation', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page.locator('h1')).toContainText('Engine Penggajian & PPh 21');

    // Run 10 Golden Benchmark Tests
    await page.locator('button:has-text("Uji 10 Golden Scenarios")').click();
    await expect(page.locator('text=SEMUA 10 SKENARIO GOLDEN LOLOS 100%')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=100% PASS')).toBeVisible();

    // Switch to December Reconciliation Tab
    await page.locator('button:has-text("Rekonsiliasi PPh 21 Desember")').click();
    await expect(page.locator('h3:has-text("Simulasi Rekonsiliasi PPh 21 Bulan Desember")')).toBeVisible();

    // Click calculate reconciliation
    await page.locator('button:has-text("Hitung Rekonsiliasi PPh 21 Desember")').click();
    await expect(page.locator('text=Hasil Rekonsiliasi Tahunan:')).toBeVisible();
    await expect(page.locator('text=Biaya Jabatan (Maksimal Rp 6.000.000):')).toBeVisible();
  });

  test('9. Audit Trail & RBAC Matrix Inspection', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText('Audit Trail, Keamanan & Hardening Produksi');

    // Check health cards
    await expect(page.locator('text=UP (ONLINE)')).toBeVisible();
    await expect(page.locator('text=Active Neon Branch')).toBeVisible();

    // Verify RBAC Matrix table
    await expect(page.locator('h3:has-text("Matriks Hak Akses Berbasis Peran")')).toBeVisible();
    await expect(page.locator('table').getByText('super / admin')).toBeVisible();
    await expect(page.locator('table').getByText('direksi', { exact: true })).toBeVisible();
    await expect(page.locator('table').getByText('karyawan', { exact: true })).toBeVisible();
  });
});
