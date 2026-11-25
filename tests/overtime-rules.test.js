const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateOvertimeDuration, validateOvertimeRequest } = require('../src/features/requests/rules/overtime');

test('Overtime Business Rules (PP 35/2021)', async (t) => {
  await t.test('Calculates regular overtime duration', () => {
    const hours = calculateOvertimeDuration('18:00', '21:30');
    assert.equal(hours, 3.5);
  });

  await t.test('Calculates overnight shift overtime duration accurately', () => {
    // 22:00 to 02:00 next day = 4.0 hours
    const hours = calculateOvertimeDuration('22:00', '02:00');
    assert.equal(hours, 4.0);
  });

  await t.test('Distinguishes daytime vs overnight shifts accurately (No string comparison bugs)', () => {
    // Daytime shift: 9:00 to 17:00 is NOT overnight
    const daytime = validateOvertimeRequest({ startTimeStr: '09:00', endTimeStr: '12:00' });
    assert.equal(daytime.isOvernight, false, '09:00 to 12:00 must NOT be overnight');

    // Unpadded strings e.g. 9:00 to 17:00
    const daytimeUnpadded = validateOvertimeRequest({ startTimeStr: '9:00', endTimeStr: '17:00', isHoliday: true });
    assert.equal(daytimeUnpadded.isOvernight, false, '9:00 to 17:00 must NOT be overnight');

    // True overnight shift: 22:00 to 02:00
    const overnight = validateOvertimeRequest({ startTimeStr: '22:00', endTimeStr: '02:00' });
    assert.equal(overnight.isOvernight, true, '22:00 to 02:00 must be marked overnight');
  });

  await t.test('Enforces daily limit of 4 hours per PP 35/2021', () => {
    const valid = validateOvertimeRequest({ startTimeStr: '18:00', endTimeStr: '21:00' }); // 3 hrs
    assert.equal(valid.isValid, true);
    assert.equal(valid.hours, 3);

    const exceeded = validateOvertimeRequest({ startTimeStr: '18:00', endTimeStr: '23:00' }); // 5 hrs
    assert.equal(exceeded.isValid, false);
    assert.ok(exceeded.errors[0].includes('melebihi batas legal PP 35/2021 (maksimal 4 jam/hari)'));
  });

  await t.test('Enforces weekly limit of 18 hours per PP 35/2021', () => {
    const exceededWeekly = validateOvertimeRequest({
      startTimeStr: '18:00',
      endTimeStr: '21:00', // 3 hrs
      weeklyAccumulatedHours: 16, // 16 + 3 = 19 (> 18)
    });
    assert.equal(exceededWeekly.isValid, false);
    assert.ok(exceededWeekly.errors[0].includes('melebihi batas legal PP 35/2021 (maksimal 18 jam/minggu)'));
  });

  await t.test('Holiday overtime exempt from regular workday caps', () => {
    const holidayOvertime = validateOvertimeRequest({
      startTimeStr: '08:00',
      endTimeStr: '18:00', // 10 hrs
      isHoliday: true,
    });
    assert.equal(holidayOvertime.isValid, true);
    assert.equal(holidayOvertime.hours, 10);
  });
});
