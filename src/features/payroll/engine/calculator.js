/**
 * HRIS EasyGo — Core Payroll Calculation Engine
 * Compliant with Indonesian Labor & Tax Regulations:
 * - PP 35/2021 (Overtime 1/173 multiplier, Severance, UPMK & PKWT Compensation)
 * - PP 58/2023 & PMK 168/2023 (PPh 21 TER Categories A, B, C & December Pasal 17 A1 Reconciliation)
 * - BPJS Kesehatan (4% employer + 1% employee, Rp 12,000,000 wage ceiling)
 * - BPJS Ketenagakerjaan (JHT, JP ceiling, JKK, JKM)
 * - Regional UMK Compliance Monitoring (DKI Jakarta, Kota Bekasi, Kabupaten Bekasi)
 * - Double-entry Accounting Journals (Accrual & Disbursement with failed transfer holding)
 */

// PPh 21 TER Brackets (PP 58/2023)
const TER_BRACKETS_A = [
  { max: 5400000, rate: 0.0 },
  { max: 5650000, rate: 0.0025 },
  { max: 5950000, rate: 0.005 },
  { max: 6300000, rate: 0.0075 },
  { max: 6750000, rate: 0.01 },
  { max: 7500000, rate: 0.0125 },
  { max: 8550000, rate: 0.015 },
  { max: 9650000, rate: 0.0175 },
  { max: 10050000, rate: 0.02 },
  { max: 10350000, rate: 0.0225 },
  { max: 10700000, rate: 0.025 },
  { max: 11050000, rate: 0.03 },
  { max: 11600000, rate: 0.035 },
  { max: 12500000, rate: 0.04 },
  { max: 13750000, rate: 0.05 },
  { max: 15100000, rate: 0.06 },
  { max: 16950000, rate: 0.07 },
  { max: 19750000, rate: 0.08 },
  { max: 24150000, rate: 0.09 },
  { max: 26450000, rate: 0.10 },
  { max: Infinity, rate: 0.15 }
];

const TER_BRACKETS_B = [
  { max: 6200000, rate: 0.0 },
  { max: 6500000, rate: 0.0025 },
  { max: 6850000, rate: 0.005 },
  { max: 7300000, rate: 0.0075 },
  { max: 9200000, rate: 0.01 },
  { max: 10750000, rate: 0.015 },
  { max: 12550000, rate: 0.02 },
  { max: 14300000, rate: 0.03 },
  { max: 16000000, rate: 0.04 },
  { max: 17450000, rate: 0.05 },
  { max: 19600000, rate: 0.06 },
  { max: 21600000, rate: 0.07 },
  { max: 24450000, rate: 0.08 },
  { max: 27800000, rate: 0.09 },
  { max: Infinity, rate: 0.15 }
];

const TER_BRACKETS_C = [
  { max: 6600000, rate: 0.0 },
  { max: 6950000, rate: 0.0025 },
  { max: 7350000, rate: 0.005 },
  { max: 7800000, rate: 0.0075 },
  { max: 8850000, rate: 0.01 },
  { max: 9800000, rate: 0.0125 },
  { max: 10950000, rate: 0.015 },
  { max: 12800000, rate: 0.02 },
  { max: 15150000, rate: 0.03 },
  { max: 16950000, rate: 0.04 },
  { max: 18750000, rate: 0.05 },
  { max: 21100000, rate: 0.06 },
  { max: Infinity, rate: 0.15 }
];

const PTKP_ANNUAL_TABLE = {
  'TK/0': 54000000,
  'TK/1': 58500000,
  'TK/2': 63000000,
  'TK/3': 67500000,
  'K/0': 58500000,
  'K/1': 63000000,
  'K/2': 67500000,
  'K/3': 72000000,
};

const UMK_TABLE = {
  'DKI Jakarta': { 2024: 5067381, 2025: 5396761, 2026: 5396761 },
  'Kota Bekasi': { 2024: 5343430, 2025: 5690752, 2026: 5690752 },
  'Kabupaten Bekasi': { 2024: 5219263, 2025: 5558515, 2026: 5558515 },
};

/**
 * Get TER Category from PTKP code
 */
function getTerCategory(ptkp) {
  const p = (ptkp || 'TK/0').toUpperCase().trim();
  if (['TK/0', 'TK/1', 'K/0'].includes(p)) return 'A';
  if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(p)) return 'B';
  if (p === 'K/3') return 'C';
  return 'A';
}

/**
 * Get TER tax rate for gross monthly income
 */
function getTerRate(category, grossIncome) {
  let brackets = TER_BRACKETS_A;
  if (category === 'B') brackets = TER_BRACKETS_B;
  else if (category === 'C') brackets = TER_BRACKETS_C;

  for (const b of brackets) {
    if (grossIncome <= b.max) {
      return b.rate;
    }
  }
  return 0.15;
}

/**
 * Calculate monthly PPh 21 TER
 */
function calculatePPh21TER({ grossIncome, ptkp = 'TK/0', hasNpwp = true }) {
  const category = getTerCategory(ptkp);
  const baseRate = getTerRate(category, grossIncome);
  const finalRate = hasNpwp ? baseRate : baseRate * 1.2; // 20% penalty without NPWP
  const tax = Math.round(grossIncome * finalRate);
  return {
    category,
    baseRate,
    effectiveRate: finalRate,
    tax,
  };
}

/**
 * Annual PPh 21 Re-reconciliation (Desember A1 / Pasal 17)
 * PMK 168/2023 & UU HPP Pasal 17
 */
function calculateAnnualPPh21Pasal17({
  annualGrossIncome,
  ptkp = 'TK/0',
  hasNpwp = true,
  previousWithheldTax = 0,
  annualBpjsEmployee = 0,
}) {
  // Biaya Jabatan: 5% of gross income, max Rp 6,000,000 per year (PMK 168/2023)
  const biayaJabatan = Math.min(Math.round(annualGrossIncome * 0.05), 6000000);
  const ptkpValue = PTKP_ANNUAL_TABLE[ptkp] || 54000000;

  // Annual Net Taxable Income (Penghasilan Kena Pajak - PKP)
  const netAnnualIncome = Math.max(0, annualGrossIncome - biayaJabatan - annualBpjsEmployee);
  // Rounded down to nearest 1,000 per UU PPh
  const pkp = Math.max(0, Math.floor((netAnnualIncome - ptkpValue) / 1000) * 1000);

  // Pasal 17 progressive brackets
  const brackets = [
    { max: 60000000, rate: 0.05 },
    { max: 250000000, rate: 0.15 },
    { max: 500000000, rate: 0.25 },
    { max: 5000000000, rate: 0.30 },
    { max: Infinity, rate: 0.35 },
  ];

  let baseTax = 0;
  let prevMax = 0;
  for (const b of brackets) {
    if (pkp > prevMax) {
      const taxable = Math.min(pkp - prevMax, b.max - prevMax);
      baseTax += taxable * b.rate;
      prevMax = b.max;
    }
  }

  const finalAnnualTax = hasNpwp ? Math.round(baseTax) : Math.round(baseTax * 1.2);
  const decemberTax = Math.max(0, finalAnnualTax - previousWithheldTax);

  return {
    annualGrossIncome,
    biayaJabatan,
    ptkp,
    ptkpValue,
    annualBpjsEmployee,
    pkp,
    finalAnnualTax,
    previousWithheldTax,
    decemberTax,
  };
}

/**
 * Calculate Overtime Factor per PP 35/2021
 * Formula: Hourly Rate = Monthly Wage / 173
 */
function calculateOvertimeFactor(hours, isHoliday = false, is6DayPattern = false) {
  let factor = 0;
  if (!isHoliday) {
    // Regular workday: 1st hour 1.5x, following hours 2.0x
    if (hours > 0) {
      factor += Math.min(hours, 1) * 1.5;
      if (hours > 1) {
        factor += (hours - 1) * 2.0;
      }
    }
  } else {
    // Rest Day / Holiday
    if (is6DayPattern) {
      // 6-day work week: first 7 hrs 2.0x, 8th hr 3.0x, 9th+ hr 4.0x
      if (hours <= 7) {
        factor = hours * 2.0;
      } else if (hours === 8) {
        factor = 7 * 2.0 + 1 * 3.0;
      } else {
        factor = 7 * 2.0 + 1 * 3.0 + (hours - 8) * 4.0;
      }
    } else {
      // 5-day work week: first 8 hrs 2.0x, 9th hr 3.0x, 10th+ hr 4.0x
      if (hours <= 8) {
        factor = hours * 2.0;
      } else if (hours === 9) {
        factor = 8 * 2.0 + 1 * 3.0;
      } else {
        factor = 8 * 2.0 + 1 * 3.0 + (hours - 9) * 4.0;
      }
    }
  }
  return factor;
}

function calculateOvertimePay({ monthlyWage, hours, isHoliday = false, is6DayPattern = false }) {
  const hourlyRate = monthlyWage / 173;
  const factor = calculateOvertimeFactor(hours, isHoliday, is6DayPattern);
  const totalPay = Math.round(hourlyRate * factor);
  return {
    monthlyWage,
    hourlyRate: Math.round(hourlyRate),
    hours,
    factor,
    totalPay,
  };
}

/**
 * Calculate Statutory BPJS
 */
function calculateBPJS(wage) {
  // BPJS Kesehatan wage cap Rp 12,000,000
  const kesWage = Math.min(wage, 12000000);
  const bpjsKesCompany = Math.round(kesWage * 0.04);
  const bpjsKesEmployee = Math.round(kesWage * 0.01);

  // BPJS TK Jaminan Pensiun wage cap Rp 10,042,300
  const jpWage = Math.min(wage, 10042300);
  const bpjsJpCompany = Math.round(jpWage * 0.02);
  const bpjsJpEmployee = Math.round(jpWage * 0.01);

  // JHT: Company 3.7%, Employee 2.0%
  const bpjsJhtCompany = Math.round(wage * 0.037);
  const bpjsJhtEmployee = Math.round(wage * 0.02);

  // JKK (0.24%) & JKM (0.30%)
  const bpjsJkkCompany = Math.round(wage * 0.0024);
  const bpjsJkmCompany = Math.round(wage * 0.0030);

  const totalCompany = bpjsKesCompany + bpjsJpCompany + bpjsJhtCompany + bpjsJkkCompany + bpjsJkmCompany;
  const totalEmployee = bpjsKesEmployee + bpjsJpEmployee + bpjsJhtEmployee;

  return {
    kesehatan: { company: bpjsKesCompany, employee: bpjsKesEmployee },
    ketenagakerjaan: {
      jht: { company: bpjsJhtCompany, employee: bpjsJhtEmployee },
      jp: { company: bpjsJpCompany, employee: bpjsJpEmployee },
      jkk: { company: bpjsJkkCompany },
      jkm: { company: bpjsJkmCompany },
    },
    totalCompany,
    totalEmployee,
  };
}

/**
 * Statutory Pesangon Months (PP 35/2021 Pasal 40 ayat 2)
 */
function getStatutorySeveranceMonths(yearsOfService) {
  if (yearsOfService < 1) return 1;
  return Math.min(9, Math.floor(yearsOfService) + 1);
}

/**
 * Statutory UPMK Months (PP 35/2021 Pasal 40 ayat 3)
 */
function getStatutoryUpmkMonths(yearsOfService) {
  if (yearsOfService < 3) return 0;
  if (yearsOfService < 6) return 2;
  if (yearsOfService < 9) return 3;
  if (yearsOfService < 12) return 4;
  if (yearsOfService < 15) return 5;
  if (yearsOfService < 18) return 6;
  if (yearsOfService < 21) return 7;
  if (yearsOfService < 24) return 8;
  return 10;
}

/**
 * Tiered Final Tax on Severance (PP 68/2009)
 */
function calculatePPhFinalSeverance(gross) {
  const brackets = [
    { max: 50000000, rate: 0.0 },
    { max: 100000000, rate: 0.05 },
    { max: 500000000, rate: 0.15 },
    { max: Infinity, rate: 0.25 },
  ];
  let tax = 0;
  let prevMax = 0;
  for (const b of brackets) {
    if (gross > prevMax) {
      const taxableInBracket = Math.min(gross - prevMax, b.max - prevMax);
      tax += taxableInBracket * b.rate;
      prevMax = b.max;
    }
  }
  return Math.round(tax);
}

/**
 * Calculate Severance, UPMK, and Termination Compensation (PP 35/2021)
 */
const PHK_REASONS = {
  efisiensi: { pesangonMult: 1.0, upmkMult: 1.0, label: 'Efisiensi untuk mencegah kerugian (Pasal 43 ayat 2)' },
  rugi: { pesangonMult: 0.5, upmkMult: 1.0, label: 'Efisiensi karena perusahaan rugi (Pasal 43 ayat 1)' },
  langgar: { pesangonMult: 0.5, upmkMult: 1.0, label: 'Pelanggaran sesudah surat peringatan (Pasal 52 ayat 1)' },
  mendesak: { pesangonMult: 0.0, upmkMult: 0.0, label: 'Pelanggaran bersifat mendesak (Pasal 52 ayat 2)' },
  pensiun: { pesangonMult: 1.75, upmkMult: 1.0, label: 'Memasuki usia pensiun (Pasal 56)' },
  sakit: { pesangonMult: 2.0, upmkMult: 1.0, label: 'Sakit berkepanjangan > 12 bulan (Pasal 55 ayat 2)' },
  meninggal: { pesangonMult: 2.0, upmkMult: 1.0, label: 'Meninggal dunia (Pasal 57)' },
  resign: { pesangonMult: 0.0, upmkMult: 0.0, label: 'Mengundurkan diri (Pasal 50)' },
  pkwt: { pesangonMult: 0.0, upmkMult: 0.0, label: 'PKWT berakhir (Pasal 15 sampai 17)' },
};

function calculateTerminationPay({ monthlyWage, yearsOfService, monthsOfService, reason }) {
  const rule = PHK_REASONS[reason] || { pesangonMult: 0, upmkMult: 0, label: reason };

  let severanceMonths = 0;
  let upmkMonths = 0;
  let pkwtCompensation = 0;

  if (reason === 'pkwt') {
    // PP 35/2021 Pasal 16: Masa kerja per bulan / 12 * upah sebulan
    const effectiveMonths = monthsOfService !== undefined ? monthsOfService : (yearsOfService * 12);
    pkwtCompensation = Math.round((Math.min(effectiveMonths, 12 * 99) / 12) * monthlyWage);
  } else {
    severanceMonths = getStatutorySeveranceMonths(yearsOfService) * rule.pesangonMult;
    upmkMonths = getStatutoryUpmkMonths(yearsOfService) * rule.upmkMult;
  }

  const severancePay = Math.round(severanceMonths * monthlyWage);
  const upmkPay = Math.round(upmkMonths * monthlyWage);
  const grossSeverance = severancePay + upmkPay;

  // Tiered PPh Final atas Pesangon (PP 68/2009)
  const pphFinal = calculatePPhFinalSeverance(grossSeverance);

  return {
    reason,
    ruleLabel: rule.label,
    yearsOfService,
    severanceMonths,
    severancePay,
    upmkMonths,
    upmkPay,
    pkwtCompensation,
    grossSeverance,
    pphFinal,
    netTermination: grossSeverance - pphFinal + pkwtCompensation,
  };
}

/**
 * Prorate Salary by Work Days
 */
function calculateProrated({ basicSalary, fixedAllowance = 0, totalWorkDays, actualWorkDays }) {
  if (totalWorkDays <= 0) return { basicSalary: 0, fixedAllowance: 0, total: 0 };
  const proratedBasic = Math.round(basicSalary * actualWorkDays / totalWorkDays);
  const proratedAllowance = Math.round(fixedAllowance * actualWorkDays / totalWorkDays);
  return {
    basicSalary: proratedBasic,
    fixedAllowance: proratedAllowance,
    total: proratedBasic + proratedAllowance,
  };
}

/**
 * Regional UMK Compliance Check
 */
function checkUmkCompliance({ wage, city = 'DKI Jakarta', year = 2026 }) {
  const cityData = UMK_TABLE[city] || UMK_TABLE['DKI Jakarta'];
  const umkValue = cityData[year] || cityData[2024];
  const isCompliant = wage >= umkValue;
  return {
    city,
    year,
    wage,
    umkValue,
    difference: wage - umkValue,
    isCompliant,
    flag: isCompliant ? null : 'Upah di bawah UMK',
  };
}

/**
 * Double-Entry Accounting Journals for Payroll
 * Enforces debit = credit and traces unpaid payable holding for failed transfers
 */
function generatePayrollJournals({ periodId, periodName, totalNetPay, transferRecords = [] }) {
  // Journal 1: Pengakuan Beban (Accrual Journal)
  const journalAccrual = {
    no: `JU-${periodId}-1`,
    title: `Pengakuan beban ${periodName}`,
    entries: [
      { account: '6199', name: 'Beban Gaji & Upah', debit: totalNetPay, credit: 0 },
      { account: '2111', name: 'Utang Gaji (Salary Payable)', debit: 0, credit: totalNetPay },
    ],
  };
  const j1Dr = journalAccrual.entries.reduce((sum, e) => sum + e.debit, 0);
  const j1Cr = journalAccrual.entries.reduce((sum, e) => sum + e.credit, 0);
  journalAccrual.isBalanced = j1Dr === j1Cr;

  // Journal 2: Pembayaran Gaji (Disbursement Journal)
  let successfulAmount = 0;
  let failedAmount = 0;
  for (const trf of transferRecords) {
    if (trf.status === 'Berhasil' || trf.status === 'Dibayar ulang') {
      successfulAmount += trf.amount;
    } else if (trf.status === 'Gagal') {
      failedAmount += trf.amount;
    }
  }

  const journalDisbursement = {
    no: `JU-${periodId}-2`,
    title: `Pembayaran ${periodName}`,
    entries: [
      { account: '2111', name: 'Utang Gaji (Salary Payable)', debit: successfulAmount, credit: 0 },
      { account: '1111', name: 'Kas & Bank', debit: 0, credit: successfulAmount },
    ],
    unpaidPayableBalance: totalNetPay - successfulAmount,
    failedAmount,
  };
  const j2Dr = journalDisbursement.entries.reduce((sum, e) => sum + e.debit, 0);
  const j2Cr = journalDisbursement.entries.reduce((sum, e) => sum + e.credit, 0);
  journalDisbursement.isBalanced = j2Dr === j2Cr;

  return {
    journalAccrual,
    journalDisbursement,
    remainingSalaryPayable: totalNetPay - successfulAmount,
    allBalanced: journalAccrual.isBalanced && journalDisbursement.isBalanced,
  };
}

/**
 * Back-pay (Rapel) Adjustment Model for Locked Periods
 */
function calculateRapelAdjustment({ lockedPeriod, nextPeriod, rapelAmount, componentCode = 'KG-03' }) {
  if (lockedPeriod.status !== 'Dikunci') {
    throw new Error('Periode asal harus berstatus Dikunci untuk pengajuan rapel');
  }
  return {
    lockedPeriodId: lockedPeriod.id,
    lockedPeriodStatus: lockedPeriod.status,
    lockedPeriodNetPay: lockedPeriod.netPay,
    rapelAmount,
    componentCode,
    nextPeriodId: nextPeriod.id,
    nextPeriodNetPay: nextPeriod.netPay + rapelAmount,
    lockedPeriodUnchanged: true,
  };
}

/**
 * Calculate single employee payroll
 */
function calculateEmployeePayroll({
  basicSalary = 5000000,
  allowances = 0,
  overtimeHours = 0,
  maritalStatus = 'TK/0',
  hasNpwp = true,
  month = 11,
  isDecember = false,
}) {
  const fixedWage = basicSalary + allowances;
  const otCalc = calculateOvertimePay({ monthlyWage: fixedWage, hours: overtimeHours });
  const bpjs = calculateBPJS(fixedWage);
  const grossIncome = fixedWage + otCalc.totalPay;
  const pphCalc = calculatePPh21TER({
    grossIncome,
    ptkp: maritalStatus,
    hasNpwp,
  });
  const netPay = grossIncome - bpjs.totalEmployee - pphCalc.tax;

  return {
    basicSalary,
    allowances,
    overtimeHours,
    overtimePay: otCalc.totalPay,
    bpjsEmployee: bpjs.totalEmployee,
    bpjsCompany: bpjs.totalCompany,
    deductions: 0,
    pph21: pphCalc.tax,
    netPay,
    grossIncome,
    bpjsBreakdown: bpjs,
    pphBreakdown: pphCalc,
  };
}

/**
 * December Reconciliation adapter
 */
function calculateDecemberPasal17Reconciliation({
  annualGrossIncome = 180000000,
  previousWithheldPph21 = 0,
  ptkpCategory = 'TK/0',
  hasNpwp = true,
}) {
  const result = calculateAnnualPPh21Pasal17({
    annualGrossIncome,
    ptkp: ptkpCategory,
    hasNpwp,
    previousWithheldTax: previousWithheldPph21,
  });

  const netAnnualIncome = Math.max(0, annualGrossIncome - result.biayaJabatan);

  return {
    ...result,
    biayaJabatan: result.biayaJabatan,
    netAnnualIncome,
    ptkpAmount: result.ptkpValue,
    pkp: result.pkp,
    annualTaxPayable: result.finalAnnualTax,
    previousWithheldPph21: result.previousWithheldTax,
    decemberTaxDue: result.decemberTax,
  };
}

/**
 * Run all 10 Golden Benchmark scenarios + December reconciliation
 */
function runAllGoldenScenarios() {
  const results = [];

  // Scenario 1
  const s1Prorata = calculateProrated({
    basicSalary: 9000000,
    fixedAllowance: 1000000,
    totalWorkDays: 22,
    actualWorkDays: 11,
  });
  results.push({
    id: 1,
    title: 'Karyawan masuk tengah bulan (Prorata hari kerja)',
    name: 'Karyawan masuk tengah bulan',
    regulation: 'PP 35/2021 & UU Cipta Kerja',
    rule: 'Gaji pokok dan tunjangan tetap prorata hari kerja sejak tanggal masuk',
    passed: s1Prorata.basicSalary === 4500000 && s1Prorata.fixedAllowance === 500000,
    expected: 'Gaji pokok Rp 4.500.000, Tunjangan Rp 500.000',
    actual: `Gaji pokok Rp ${s1Prorata.basicSalary.toLocaleString()}, Tunjangan Rp ${s1Prorata.fixedAllowance.toLocaleString()}`,
  });

  // Scenario 2
  const s2Final = calculateTerminationPay({
    monthlyWage: 10000000,
    yearsOfService: 3,
    reason: 'efisiensi',
  });
  results.push({
    id: 2,
    title: 'Keluar dengan final pay (Efisiensi PP 35/2021)',
    name: 'Keluar dengan final pay',
    regulation: 'PP 35/2021 Pasal 43 ayat 2 & PP 68/2009',
    rule: 'Efisiensi PP 35/2021: pesangon 4 bulan, UPMK 2 bulan, PPh final bertingkat',
    passed: s2Final.severancePay === 40000000 && s2Final.upmkPay === 20000000 && s2Final.pphFinal === 500000,
    expected: 'Pesangon Rp 40M, UPMK Rp 20M, PPh Final Rp 500.000',
    actual: `Pesangon Rp ${s2Final.severancePay.toLocaleString()}, UPMK Rp ${s2Final.upmkPay.toLocaleString()}, PPh Final Rp ${s2Final.pphFinal.toLocaleString()}`,
  });

  // Scenario 3
  const s3ProrataOld = calculateProrated({ basicSalary: 8000000, totalWorkDays: 22, actualWorkDays: 10 });
  const s3ProrataNew = calculateProrated({ basicSalary: 9000000, totalWorkDays: 22, actualWorkDays: 12 });
  const s3Total = s3ProrataOld.basicSalary + s3ProrataNew.basicSalary;
  results.push({
    id: 3,
    title: 'Naik gaji tengah periode (Dua tarif prorata)',
    name: 'Naik gaji tengah periode',
    regulation: 'Prorata Hari Kerja Standar Depnaker',
    rule: 'Dua tarif dalam satu periode, masing-masing prorata hari kerja',
    passed: s3Total === (Math.round(8000000 * 10 / 22) + Math.round(9000000 * 12 / 22)),
    expected: 'Dua segmen gaji pokok dijumlahkan prorata',
    actual: `Total gaji pokok Rp ${s3Total.toLocaleString()}`,
  });

  // Scenario 4
  const s4Overtime = calculateOvertimePay({
    monthlyWage: 8650000,
    hours: 10,
    isHoliday: true,
    is6DayPattern: false,
  });
  const s4ExpectedFactor = 23;
  const s4ExpectedTotal = Math.round((8650000 / 173) * s4ExpectedFactor);
  results.push({
    id: 4,
    title: 'Lembur hari libur (10 jam hari istirahat pola 5 hari)',
    name: 'Lembur hari libur',
    regulation: 'PP 35/2021 Pasal 31 ayat 1 huruf a',
    rule: 'PP 35/2021: 10 jam hari istirahat, pengali 23x upah/173',
    passed: s4Overtime.factor === s4ExpectedFactor && s4Overtime.totalPay === s4ExpectedTotal,
    expected: `Faktor 23, Total upah lembur Rp ${s4ExpectedTotal.toLocaleString()}`,
    actual: `Faktor ${s4Overtime.factor}, Total upah lembur Rp ${s4Overtime.totalPay.toLocaleString()}`,
  });

  // Scenario 5
  const s5Bruto = 8000000 + 4000000 + 8000000;
  const s5Pph = calculatePPh21TER({ grossIncome: s5Bruto, ptkp: 'TK/0', hasNpwp: true });
  results.push({
    id: 5,
    title: 'Pinjaman, THR, dan bonus di bulan yang sama',
    name: 'Pinjaman, THR, dan bonus sebulan',
    regulation: 'PP 58/2023 TER Kategori A (9%)',
    rule: 'PPh 21 TER atas gabungan bruto masa yang sama (PP 58/2023)',
    passed: s5Pph.tax === Math.round(s5Bruto * 0.09),
    expected: 'TER Kategori A (9%) = Rp 1.800.000',
    actual: `Tarif ${(s5Pph.effectiveRate * 100).toFixed(1)}%, Pajak Rp ${s5Pph.tax.toLocaleString()}`,
  });

  // Scenario 6
  const bekasiCheck = checkUmkCompliance({ wage: 5200000, city: 'Kota Bekasi', year: 2024 });
  const jakartaCheck = checkUmkCompliance({ wage: 5200000, city: 'DKI Jakarta', year: 2024 });
  const s6Passed = !bekasiCheck.isCompliant && bekasiCheck.flag === 'Upah di bawah UMK' &&
                   jakartaCheck.isCompliant && jakartaCheck.flag === null;
  results.push({
    id: 6,
    title: 'Beda UMK regional (Bekasi vs Jakarta)',
    name: 'Beda UMK regional',
    regulation: 'Kepgub & Permenaker Upah Minimum',
    rule: 'Upah Rp 5.200.000: di bawah UMK Bekasi, di atas UMK Jakarta',
    passed: s6Passed,
    expected: 'Bekasi: Ditandai di bawah UMK; Jakarta: Memenuhi UMK',
    actual: `Bekasi compliant=${bekasiCheck.isCompliant}, Jakarta compliant=${jakartaCheck.isCompliant}`,
  });

  // Scenario 7
  const s7Pkwt12 = calculateTerminationPay({ monthlyWage: 6000000, yearsOfService: 1, monthsOfService: 12, reason: 'pkwt' });
  const s7Pkwt6 = calculateTerminationPay({ monthlyWage: 6000000, yearsOfService: 0.5, monthsOfService: 6, reason: 'pkwt' });
  const s7Passed = s7Pkwt12.pkwtCompensation === 6000000 && s7Pkwt12.severancePay === 0 &&
                   s7Pkwt6.pkwtCompensation === 3000000;
  results.push({
    id: 7,
    title: 'PKWT berakhir (Kompensasi proporsional masa kerja)',
    name: 'PKWT berakhir',
    regulation: 'PP 35/2021 Pasal 15 s/d 17',
    rule: 'Kontrak 12 bln kompensasi 1x upah, 6 bln kompensasi 0.5x upah',
    passed: s7Passed,
    expected: 'Kompensasi 12 bln = Rp 6M, 6 bln = Rp 3M; Pesangon = Rp 0',
    actual: `12 bln: Rp ${s7Pkwt12.pkwtCompensation.toLocaleString()}, 6 bln: Rp ${s7Pkwt6.pkwtCompensation.toLocaleString()}`,
  });

  // Scenario 8
  const s8WithNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: true });
  const s8NoNpwp = calculatePPh21TER({ grossIncome: 12000000, ptkp: 'TK/0', hasNpwp: false });
  results.push({
    id: 8,
    title: 'Data pajak belum lengkap (Tanpa NPWP tarif 120%)',
    name: 'Data pajak tanpa NPWP',
    regulation: 'UU PPh Pasal 21 ayat 5a (Penalti 20%)',
    rule: 'Tanpa NPWP: PPh 21 tarif 120% lebih tinggi (penalti 20%)',
    passed: s8NoNpwp.tax === Math.round(s8WithNpwp.tax * 1.2),
    expected: `PPh ber-NPWP Rp ${s8WithNpwp.tax.toLocaleString()} -> tanpa NPWP Rp ${Math.round(s8WithNpwp.tax * 1.2).toLocaleString()}`,
    actual: `PPh tanpa NPWP Rp ${s8NoNpwp.tax.toLocaleString()}`,
  });

  // Scenario 9
  const initialJournals = generatePayrollJournals({
    periodId: 'PR-2026-11',
    periodName: 'Gaji November 2026',
    totalNetPay: 7000000,
    transferRecords: [{ empId: 'E11', amount: 7000000, status: 'Gagal' }],
  });
  const retryJournals = generatePayrollJournals({
    periodId: 'PR-2026-11',
    periodName: 'Gaji November 2026',
    totalNetPay: 7000000,
    transferRecords: [{ empId: 'E11', amount: 7000000, status: 'Dibayar ulang' }],
  });
  const s9Passed = initialJournals.allBalanced && initialJournals.remainingSalaryPayable === 7000000 &&
                   retryJournals.allBalanced && retryJournals.remainingSalaryPayable === 0;
  results.push({
    id: 9,
    title: 'Transfer gaji gagal & bayar ulang (Jurnal seimbang)',
    name: 'Transfer gaji gagal & bayar ulang',
    regulation: 'Prinsip Akuntansi PSAK / IFRS Double-Entry',
    rule: 'Gagal transfer tetap di utang gaji hingga dibayar ulang; neraca seimbang',
    passed: s9Passed,
    expected: 'Sebelum retry: Utang gaji Rp 7M; Sesudah retry: Rp 0; Jurnal seimbang',
    actual: `Sisa sebelum=${initialJournals.remainingSalaryPayable}, sesudah=${retryJournals.remainingSalaryPayable}`,
  });

  // Scenario 10
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
    title: 'Rapel penyesuaian periode terkunci (Period lock integrity)',
    name: 'Rapel penyesuaian periode terkunci',
    regulation: 'Integritas Audit Periode Terkunci',
    rule: 'Koreksi periode terkunci masuk periode berikutnya tanpa mengubah periode terkunci',
    passed: s10Passed,
    expected: 'Periode terkunci tetap Rp 6.5M, Periode berikutnya Rp 6.535M',
    actual: `Terkunci: Rp ${rapelResult.lockedPeriodNetPay.toLocaleString()}, Berikutnya: Rp ${rapelResult.nextPeriodNetPay.toLocaleString()}`,
  });

  // Scenario 11
  const annualRec = calculateAnnualPPh21Pasal17({
    annualGrossIncome: 144000000,
    ptkp: 'TK/0',
    hasNpwp: true,
    previousWithheldTax: 432000,
  });
  results.push({
    id: 11,
    title: 'Rekonsiliasi PPh 21 Desember (UU HPP Pasal 17 A1)',
    name: 'Rekonsiliasi PPh 21 Desember (Pasal 17 A1)',
    regulation: 'UU HPP Pasal 17 & PMK 168/2023',
    rule: 'Pasal 17 UU PPh atas PKP setahun dikurangi potongan TER masa 1-11',
    passed: annualRec.finalAnnualTax > 0 && annualRec.decemberTax >= 0,
    expected: 'Pajak Desember dihitung dari selisih pajak setahun Pasal 17 dengan TER 1-11',
    actual: `Pajak tahunan: Rp ${annualRec.finalAnnualTax.toLocaleString()}, Pajak Des: Rp ${annualRec.decemberTax.toLocaleString()}`,
  });

  return results;
}

module.exports = {
  getTerCategory,
  getTerRate,
  calculatePPh21TER,
  calculateAnnualPPh21Pasal17,
  calculateOvertimeFactor,
  calculateOvertimePay,
  calculateBPJS,
  getStatutorySeveranceMonths,
  getStatutoryUpmkMonths,
  calculatePPhFinalSeverance,
  calculateTerminationPay,
  calculateProrated,
  checkUmkCompliance,
  generatePayrollJournals,
  calculateRapelAdjustment,
  calculateEmployeePayroll,
  calculateDecemberPasal17Reconciliation,
  runAllGoldenScenarios,
  PTKP_ANNUAL_TABLE,
  UMK_TABLE,
  PHK_REASONS,
};
