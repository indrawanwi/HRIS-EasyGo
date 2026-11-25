export interface UserSession {
  id: string;
  empId: string;
  name: string;
  email: string;
  roles: string[];
  positionTitle?: string;
  departmentId?: string;
}

export const PRESET_PERSONAS: UserSession[] = [
  {
    id: 'US-E11',
    empId: 'E11',
    name: 'Tubaka (Super Admin)',
    email: 'superadmin@easygo-gps.co.id',
    roles: ['super', 'admin'],
    positionTitle: 'Super Admin',
  },
  {
    id: 'US-E01',
    empId: 'E01',
    name: 'Wulan Kusumawati (Direktur Keuangan & SDM)',
    email: 'wulan.kusumawati@easygo-gps.co.id',
    roles: ['direksi', 'atasan', 'karyawan'],
    positionTitle: 'Direktur Keuangan & SDM',
  },
  {
    id: 'US-E02',
    empId: 'E02',
    name: 'Bambang Hartono (Direktur Operasional)',
    email: 'bambang.hartono@easygo-gps.co.id',
    roles: ['direksi', 'atasan', 'karyawan'],
    positionTitle: 'Direktur Operasional',
  },
  {
    id: 'US-E08',
    empId: 'E08',
    name: 'Sari Utami (HR Manager)',
    email: 'sari.utami@easygo-gps.co.id',
    roles: ['hr', 'karyawan', 'atasan'],
    positionTitle: 'HR Manager',
  },
  {
    id: 'US-E09',
    empId: 'E09',
    name: 'Rahmat Hidayat (Finance Manager)',
    email: 'rahmat.hidayat@easygo-gps.co.id',
    roles: ['finance', 'karyawan', 'atasan'],
    positionTitle: 'Finance & Accounting Manager',
  },
  {
    id: 'US-E03',
    empId: 'E03',
    name: 'Hendra Wijaya (Fleet Manager)',
    email: 'hendra.wijaya@easygo-gps.co.id',
    roles: ['atasan', 'karyawan'],
    positionTitle: 'Head of Fleet Operations',
  },
  {
    id: 'US-E04',
    empId: 'E04',
    name: 'Rizky Pratama (Field Tech)',
    email: 'rizky.pratama@easygo-gps.co.id',
    roles: ['karyawan'],
    positionTitle: 'Teknisi instalasi GPS',
  },
];

export function getStoredUser(): UserSession {
  if (typeof window === 'undefined') {
    return PRESET_PERSONAS[0];
  }
  try {
    const raw = localStorage.getItem('easygo_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading user from localStorage', e);
  }
  return PRESET_PERSONAS[0];
}

export function setStoredUser(user: UserSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('easygo_user', JSON.stringify(user));
    window.dispatchEvent(new Event('easygo_auth_change'));
  }
}

export function hasRole(user: UserSession | null, requiredRole: string): boolean {
  if (!user) return false;
  if (user.roles.includes('super') || user.roles.includes('admin')) return true;
  return user.roles.includes(requiredRole);
}
