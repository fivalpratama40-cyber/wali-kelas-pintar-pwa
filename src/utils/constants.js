// Application Constants

export const APP_CONFIG = {
  APP_ID: import.meta.env.VITE_APP_ID || 'smart-homeroom-pwa',
  DB_VERSION: '1.0.0',
  CACHE_DURATION: 3600000, // 1 hour
  SYNC_INTERVAL: 30000, // 30 seconds
};

export const FIRESTORE_PATHS = {
  USERS: (appId) => `artifacts/${appId}/public/data/users`,
  STUDENTS: (appId) => `artifacts/${appId}/public/data/students`,
  ATTENDANCES: (appId) => `artifacts/${appId}/public/data/attendances`,
};

export const USER_ROLES = {
  ADMIN: 'admin',
  WALIKELAS: 'walikelas',
  KETUAKELAS: 'ketuakelas',
};

export const ATTENDANCE_STATUS = [
  { value: 'Hadir', label: 'Hadir', color: 'emerald', icon: '✓' },
  { value: 'Terlambat', label: 'Terlambat', color: 'amber', icon: '⏱' },
  { value: 'Sakit', label: 'Sakit', color: 'indigo', icon: '🏥' },
  { value: 'Izin', label: 'Izin', color: 'cyan', icon: '📋' },
  { value: 'Alpa', label: 'Alpa', color: 'rose', icon: '✗' },
];

export const DEFAULT_CREDENTIALS = [
  {
    id: 'u_admin',
    username: 'admin',
    password: 'adminpassword',
    name: 'Super Admin Sekolah',
    role: 'admin'
  },
  {
    id: 'u_wali',
    username: 'walikelas12',
    password: 'walipassword',
    name: 'Budi Rahardjo, S.Pd.',
    role: 'walikelas',
    waGuru: '081234567890',
    nip: '19850311 201001 1 003'
  },
  {
    id: 'u_ketua',
    username: 'ketua12',
    password: 'ketuapassword',
    name: 'Rian Hidayat',
    role: 'ketuakelas',
    class: 'XII RPL A'
  }
];

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
};
