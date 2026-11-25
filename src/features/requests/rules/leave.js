/**
 * HRIS EasyGo — Leave Business Rules Engine
 */

/**
 * Checks if a date falls on a weekend for a given pattern
 * @param {Date} date
 * @param {number[]} workDays e.g. [1,2,3,4,5] for Mon-Fri
 */
function isWorkDay(date, workDays = [1, 2, 3, 4, 5]) {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday...
  return workDays.includes(day);
}

/**
 * Safely parse YYYY-MM-DD into a midday Date object (timezone-shift immune)
 */
function parseDateMidday(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date(dateStr);
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

/**
 * Format Date object to YYYY-MM-DD
 */
function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Count total working days between startDate and endDate
 */
function countWorkingDays(startDateStr, endDateStr, workDays = [1, 2, 3, 4, 5], holidays = []) {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseDateMidday(startDateStr);
  const end = parseDateMidday(endDateStr);
  if (!start || !end || start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const iso = formatIsoDate(current);
    if (isWorkDay(current, workDays) && !holidays.includes(iso)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Validate a leave application against business rules
 */
function validateLeaveRequest({
  leaveType = { id: 'JC-01', name: 'Cuti tahunan', has_quota: true },
  startDateStr,
  endDateStr,
  quotaRemaining = 12,
  submissionDateStr = formatIsoDate(new Date()),
  workDays = [1, 2, 3, 4, 5],
  holidays = [],
  existingLeaves = [],
}) {
  const safeLeaveType = leaveType || { id: 'JC-01', name: 'Cuti tahunan', has_quota: true };
  const errors = [];
  const start = parseDateMidday(startDateStr);
  const end = parseDateMidday(endDateStr);
  const submission = parseDateMidday(submissionDateStr);

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    errors.push('Tanggal mulai dan selesai cuti harus valid');
    return { isValid: false, errors, workingDays: 0 };
  }

  if (start > end) {
    errors.push('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
    return { isValid: false, errors, workingDays: 0 };
  }

  const workingDays = countWorkingDays(startDateStr, endDateStr, workDays, holidays);
  if (workingDays <= 0) {
    errors.push('Pengajuan cuti harus mencakup minimal 1 hari kerja');
  }

  // 1. Quota check
  if (safeLeaveType.has_quota) {
    if (workingDays > quotaRemaining) {
      errors.push(`Sisa kuota cuti tidak mencukupi (${quotaRemaining} hari tersisa, diajukan ${workingDays} hari)`);
    }
  }

  // 2. Retroactive limit (e.g. Cuti Sakit max 7 days back)
  if (start < submission) {
    const diffTime = submission.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const maxBack = safeLeaveType.max_retroactive_days || 0;
    if (maxBack === 0) {
      errors.push(`Jenis cuti ${safeLeaveType.name} tidak dapat diajukan mundur`);
    } else if (diffDays > maxBack) {
      errors.push(`Pengajuan cuti mundur melebihi batas toleransi (${maxBack} hari)`);
    }
  }

  // 3. Overlap check
  const startIso = formatIsoDate(start);
  const endIso = formatIsoDate(end);
  const hasOverlap = existingLeaves.some((l) => {
    if (l.status === 'Ditolak' || l.status === 'Dibatalkan') return false;
    const lStart = l.start_date ? l.start_date.slice(0, 10) : '';
    const lEnd = l.end_date ? l.end_date.slice(0, 10) : '';
    return lStart <= endIso && lEnd >= startIso;
  });
  if (hasOverlap) {
    errors.push('Terdapat pengajuan cuti yang bertabrakan pada rentang tanggal tersebut');
  }

  return {
    isValid: errors.length === 0,
    errors,
    workingDays,
    remainingQuotaAfter: safeLeaveType.has_quota ? quotaRemaining - workingDays : quotaRemaining,
  };
}

module.exports = {
  isWorkDay,
  countWorkingDays,
  validateLeaveRequest,
  parseDateMidday,
  formatIsoDate,
};
