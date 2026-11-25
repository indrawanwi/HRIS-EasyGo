/**
 * HRIS EasyGo — Overtime Business Rules Engine (PP 35/2021)
 */
const { calculateOvertimePay } = require('../../payroll/engine/calculator');

/**
 * Calculate overtime duration between start and end time string (HH:mm)
 * Handles overnight shifts automatically (e.g. 22:00 to 02:00 = 4.0 hours)
 */
function calculateOvertimeDuration(startTimeStr, endTimeStr) {
  const [sH, sM] = startTimeStr.split(':').map(Number);
  const [eH, eM] = endTimeStr.split(':').map(Number);

  let startMinutes = sH * 60 + sM;
  let endMinutes = eH * 60 + eM;

  // Overnight shift: end time is next day
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const durationHours = (endMinutes - startMinutes) / 60;
  return Math.round(durationHours * 100) / 100;
}

/**
 * Validate overtime submission against statutory PP 35/2021 limits
 */
function validateOvertimeRequest({
  startTimeStr,
  endTimeStr,
  weeklyAccumulatedHours = 0,
  isHoliday = false,
}) {
  const errors = [];
  const hours = calculateOvertimeDuration(startTimeStr, endTimeStr);

  const [sH, sM] = startTimeStr.split(':').map(Number);
  const [eH, eM] = endTimeStr.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;
  // Numerical check for overnight crossing
  const isOvernight = endMinutes < startMinutes;

  if (hours <= 0) {
    errors.push('Durasi lembur harus lebih dari 0 jam');
  }

  // Regular workday limits per PP 35/2021 Pasal 26:
  // Maksimal 4 jam dalam 1 hari dan 18 jam dalam 1 minggu (tidak termasuk hari istirahat/libur)
  if (!isHoliday) {
    if (hours > 4) {
      errors.push(`Durasi lembur harian (${hours} jam) melebihi batas legal PP 35/2021 (maksimal 4 jam/hari)`);
    }
    if (weeklyAccumulatedHours + hours > 18) {
      errors.push(`Akumulasi lembur mingguan (${weeklyAccumulatedHours + hours} jam) melebihi batas legal PP 35/2021 (maksimal 18 jam/minggu)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    hours,
    isOvernight,
  };
}

module.exports = {
  calculateOvertimeDuration,
  validateOvertimeRequest,
  calculateOvertimePay,
};
