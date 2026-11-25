const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateProrated,
  calculateTerminationPay,
  calculateOvertimePay,
  calculatePPh21TER,
  calculateBPJS,
  checkUmkCompliance,
  generatePayrollJournals,
  calculateRapelAdjustment,
  calculateAnnualPPh21Pasal17,
} = require('../src/features/payroll/engine/calculator');

test('Payroll 10 Golden Benchmark Scenarios (Regulatory Compliance)', async (t) => {
  await t.test('Scenario 1: Karyawan masuk tengah bulan (Prorata hari kerja)', () => {
    // 11 out of 22 working days
    const res = calculateProrated({
      basicSalary: 9000000,
      fixedAllowance: 1000000,
      totalWorkDays: 22,
      actualWorkDays: 11,
    });
    assert.equal(res.basicSalary, 4500000);
    assert.equal(res.fixedAllowance, 500000);
    assert.equal(res.total, 5000000);
  });

  await t.test('Scenario 2: Keluar dengan final pay (Efisiensi PP 35/2021 Pasal 43 ayat 2 & PPh Final PP 68/2009)', () => {
    // 3 years of service: 4 months severance, 2 months UPMK
    const res3 = calculateTerminationPay({
      monthlyWage: 10000000,
      yearsOfService: 3,
      reason: 'efisiensi',
    });
    assert.equal(res3.severanceMonths, 4);
    assert.equal(res3.severancePay, 40000000);
    assert.equal(res3.upmkMonths, 2);
    assert.equal(res3.upmkPay, 20000000);
    assert.equal(res3.grossSeverance, 60000000);
    // PPh final: 0% up to 50M + 5% of 10M = 500,000
    assert.equal(res3.pphFinal, 500000);
    assert.equal(res3.netTermination, 59500000);

    // Verify engine is NOT hardcoded: test 5 years of service
    // 5 years: severance = 6 months, UPMK = 2 months
    const res5 = calculateTerminationPay({
      monthlyWage: 10000000,
      yearsOfService: 5,
      reason: 'efisiensi',
    });
    assert.equal(res5.severanceMonths, 6);
    assert.equal(res5.severancePay, 60000000);
    assert.equal(res5.upmkMonths, 2);
    assert.equal(res5.upmkPay, 20000000);
    assert.equal(res5.grossSeverance, 80000000);
    // PPh final on 80M: 0% up to 50M + 5% of 30M = 1,500,000
    assert.equal(res5.pphFinal, 1500000);

    // Test Retirement (pensiun: 1.75x severance) for 10 years of service
    // 10 years: base severance 9 months * 1.75 = 15.75 months, UPMK 4 months
    const resPensiun = calculateTerminationPay({
      monthlyWage: 10000000,
      yearsOfService: 10,
      reason: 'pensiun',
    });
    assert.equal(resPensiun.severanceMonths, 15.75);
    assert.equal(resPensiun.severancePay, 157500000);
    assert.equal(resPensiun.upmkMonths, 4);
    assert.equal(resPensiun.upmkPay, 40000000);
  });

  await t.test('Scenario 3: Naik gaji tengah periode (Dua tarif prorata hari kerja)', () => {
    const segmentOld = calculateProrated({ basicSalary: 8000000, totalWorkDays: 22, actualWorkDays: 10 });
    const segmentNew = calculateProrated({ basicSalary: 9000000, totalWorkDays: 22, actualWorkDays: 12 });
    const totalSalary = segmentOld.basicSalary + segmentNew.basicSalary;
    assert.equal(totalSalary, Math.round(8000000 * 10 / 22) + Math.round(9000000 * 12 / 22));
  });

  await t.test('Scenario 4: Lembur hari libur (PP 35/2021 Pasal 31: 10 jam holiday 5-day and 6-day week)', () => {
    // 5-day work week: 8 hrs * 2.0 + 1 hr * 3.0 + 1 hr * 4.0 = 23 factor
    const res5Day = calculateOvertimePay({
      monthlyWage: 8650000,
      hours: 10,
      isHoliday: true,
      is6DayPattern: false,
    });
    assert.equal(res5Day.factor, 23);
    const expectedPay5 = Math.round((8650000 / 173) * 23); // 50,000 * 23 = 1,150,000
    assert.equal(res5Day.totalPay, expectedPay5);

    // 6-day work week: 7 hrs * 2.0 + 1 hr * 3.0 + 2 hrs * 4.0 = 14 + 3 + 8 = 25 factor
    const res6Day = calculateOvertimePay({
      monthlyWage: 8650000,
      hours: 10,
      isHoliday: true,
      is6DayPattern: true,
    });
    assert.equal(res6Day.factor, 25);
    const expectedPay6 = Math.round((8650000 / 173) * 25); // 50,000 * 25 = 1,250,000
    assert.equal(res6Day.totalPay, expectedPay6);
  });

  await t.test('Scenario 5: Pinjaman, THR, dan bonus di bulan yang sama (PPh 21 TER gabungan PP 58/2023)', () => {
    const grossTotal = 8000000 + 4000000 + 8000000; // 20,000,000
    const pph = calculatePPh21TER({ grossIncome: grossTotal, ptkp: 'TK/0', hasNpwp: true });
    // Category A for 20M: rate is 9%
    assert.equal(pph.category, 'A');
    assert.equal(pph.effectiveRate, 0.09);
    assert.equal(pph.tax, 1800000);
  });

  await t.test('Scenario 6: Beda UMK regional (Bekasi vs Jakarta) via domain compliance engine', () => {
    const testWage = 5200000;
    const resBekasi = checkUmkCompliance({ wage: testWage, city: 'Kota Bekasi', year: 2024 });
    const resJakarta = checkUmkCompliance({ wage: testWage, city: 'DKI Jakarta', year: 2024 });

    assert.equal(resBekasi.isCompliant, false);
    assert.equal(resBekasi.flag, 'Upah di bawah UMK');
    assert.equal(resBekasi.umkValue, 5343430);

    assert.equal(resJakarta.isCompliant, true);
    assert.equal(resJakarta.flag, null);
    assert.equal(resJakarta.umkValue, 5067381);
  });

  await t.test('Scenario 7: PKWT berakhir (PP 35/2021 Pasal 16: Kompensasi proporsional masa kerja)', () => {
    // Exactly 12 months = 1x monthly wage
    const res12 = calculateTerminationPay({
      monthlyWage: 6000000,
      yearsOfService: 1,
      monthsOfService: 12,
      reason: 'pkwt',
    });
    assert.equal(res12.pkwtCompensation, 6000000);
    assert.equal(res12.severancePay, 0);
    assert.equal(res12.upmkPay, 0);

    // 6 months PKWT contract = (6/12) * wage = 3,000,000
    const res6 = calculateTerminationPay({
      monthlyWage: 6000000,
      yearsOfService: 0.5,
      monthsOfService: 6,
      reason: 'pkwt',
    });
    assert.equal(res6.pkwtCompensation, 3000000);
  });

  await t.test('Scenario 8: Data pajak tanpa NPWP (Penalti 20% / Tarif 120%)', () => {
    const withNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: true });
    const withoutNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: false });
    assert.equal(withoutNpwp.tax, Math.round(withNpwp.tax * 1.2));
  });

  await t.test('Scenario 9: Transfer gaji gagal (Neraca seimbang, utang gaji tertahan, terbayar saat retry)', () => {
    // 1. Initial disbursement with 1 failed transfer
    const initialJournals = generatePayrollJournals({
      periodId: 'PR-2026-11',
      periodName: 'Gaji November 2026',
      totalNetPay: 7000000,
      transferRecords: [
        { empId: 'E11', amount: 7000000, status: 'Gagal' },
      ],
    });

    assert.equal(initialJournals.allBalanced, true, 'Journals must balance (Debit = Credit)');
    assert.equal(initialJournals.remainingSalaryPayable, 7000000, 'Unpaid transfer stays in Utang Gaji (2111)');

    // 2. Retry succeeds
    const retryJournals = generatePayrollJournals({
      periodId: 'PR-2026-11',
      periodName: 'Gaji November 2026',
      totalNetPay: 7000000,
      transferRecords: [
        { empId: 'E11', amount: 7000000, status: 'Dibayar ulang' },
      ],
    });

    assert.equal(retryJournals.allBalanced, true);
    assert.equal(retryJournals.remainingSalaryPayable, 0, 'Utang gaji settled to 0 upon retry');
  });

  await t.test('Scenario 10: Rapel periode terkunci (Periode terkunci tidak berubah)', () => {
    const lockedPeriod = { id: 'PR-2026-10', status: 'Dikunci', netPay: 6500000 };
    const nextPeriod = { id: 'PR-2026-11', status: 'Draf', netPay: 6500000 };

    const rapel = calculateRapelAdjustment({
      lockedPeriod,
      nextPeriod,
      rapelAmount: 35000,
      componentCode: 'KG-03',
    });

    assert.equal(rapel.lockedPeriodNetPay, 6500000, 'Locked period pay must be unchanged');
    assert.equal(rapel.nextPeriodNetPay, 6535000, 'Adjustment added strictly to next period');
    assert.equal(rapel.lockedPeriodUnchanged, true);

    // Assert mutating an unlocked period throws
    assert.throws(() => {
      calculateRapelAdjustment({
        lockedPeriod: { id: 'PR-2026-10', status: 'Draf', netPay: 6500000 },
        nextPeriod,
        rapelAmount: 35000,
      });
    }, /status Dikunci/);
  });

  await t.test('Scenario 11: Rekonsiliasi PPh 21 Desember (UU HPP Pasal 17 & PMK 168/2023)', () => {
    // Annual gross 120,000,000, PTKP TK/0 (54M)
    // Biaya Jabatan = 5% * 120M = 6,000,000 (cap)
    // Net = 120M - 6M = 114,000,000
    // PKP = 114M - 54M = 60,000,000
    // Pasal 17 rate on 60M = 5% = 3,000,000
    const annualRec = calculateAnnualPPh21Pasal17({
      annualGrossIncome: 120000000,
      ptkp: 'TK/0',
      hasNpwp: true,
      previousWithheldTax: 2750000, // TER tax withheld Jan-Nov
    });

    assert.equal(annualRec.biayaJabatan, 6000000);
    assert.equal(annualRec.pkp, 60000000);
    assert.equal(annualRec.finalAnnualTax, 3000000);
    assert.equal(annualRec.decemberTax, 250000); // 3,000,000 - 2,750,000
  });
});
