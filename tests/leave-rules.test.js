const test = require('node:test');
const assert = require('node:assert/strict');
const { countWorkingDays, validateLeaveRequest } = require('../src/features/requests/rules/leave');

test('Leave Business Rules', async (t) => {
  await t.test('Counts working days excluding weekends', () => {
    // 2026-11-23 is Monday, 2026-11-27 is Friday (5 workdays)
    const days = countWorkingDays('2026-11-23', '2026-11-27', [1, 2, 3, 4, 5]);
    assert.equal(days, 5);

    // 2026-11-27 (Fri) to 2026-11-30 (Mon) -> Fri + Mon = 2 workdays (Sat & Sun excluded)
    const spanWeekend = countWorkingDays('2026-11-27', '2026-11-30', [1, 2, 3, 4, 5]);
    assert.equal(spanWeekend, 2);
  });

  await t.test('Deterministic date counting immune to host timezone shifts', () => {
    // Spans 1 full week (Mon to Sun): exactly 5 workdays
    const days = countWorkingDays('2026-06-01', '2026-06-07', [1, 2, 3, 4, 5]);
    assert.equal(days, 5);
  });

  await t.test('Excludes statutory holidays', () => {
    const days = countWorkingDays('2026-11-23', '2026-11-27', [1, 2, 3, 4, 5], ['2026-11-25']);
    assert.equal(days, 4);
  });

  await t.test('Rejects leave exceeding quota', () => {
    const leaveType = { id: 'JC-01', name: 'Cuti tahunan', has_quota: true };
    const res = validateLeaveRequest({
      leaveType,
      startDateStr: '2026-12-01',
      endDateStr: '2026-12-15', // 11 working days
      quotaRemaining: 5,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors[0].includes('Sisa kuota cuti tidak mencukupi'));
  });

  await t.test('Allows sick leave within 7 days retroactive limit', () => {
    const leaveType = { id: 'JC-02', name: 'Cuti sakit', has_quota: false, max_retroactive_days: 7 };
    const res = validateLeaveRequest({
      leaveType,
      startDateStr: '2026-11-20',
      endDateStr: '2026-11-21',
      submissionDateStr: '2026-11-24', // 4 days later (<= 7)
    });
    assert.equal(res.isValid, true);
  });

  await t.test('Rejects sick leave exceeding 7 days retroactive limit', () => {
    const leaveType = { id: 'JC-02', name: 'Cuti sakit', has_quota: false, max_retroactive_days: 7 };
    const res = validateLeaveRequest({
      leaveType,
      startDateStr: '2026-11-10',
      endDateStr: '2026-11-12',
      submissionDateStr: '2026-11-24', // 14 days later (> 7)
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors[0].includes('melebihi batas toleransi'));
  });

  await t.test('Rejects overlapping leave requests', () => {
    const leaveType = { id: 'JC-01', name: 'Cuti tahunan', has_quota: true };
    const existing = [
      { start_date: '2026-12-05', end_date: '2026-12-08', status: 'Disetujui' }
    ];
    const res = validateLeaveRequest({
      leaveType,
      startDateStr: '2026-12-07',
      endDateStr: '2026-12-10',
      existingLeaves: existing,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors[0].includes('bertabrakan'));
  });

  await t.test('Ignores rejected or cancelled leaves during overlap check', () => {
    const leaveType = { id: 'JC-01', name: 'Cuti tahunan', has_quota: true };
    const existing = [
      { start_date: '2026-12-05', end_date: '2026-12-08', status: 'Ditolak' },
      { start_date: '2026-12-05', end_date: '2026-12-08', status: 'Dibatalkan' },
    ];
    const res = validateLeaveRequest({
      leaveType,
      startDateStr: '2026-12-06',
      endDateStr: '2026-12-07',
      existingLeaves: existing,
    });
    assert.equal(res.isValid, true);
  });
});
