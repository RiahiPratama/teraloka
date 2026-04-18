/**
 * TeraLoka — User Type Definitions
 * Phase 2 · Batch 7a1 — Users Page Migration
 * ------------------------------------------------------------
 * Shared types + config untuk admin users page.
 *
 * 9 Roles (source of truth, NOT 5):
 *   super_admin, admin_content, admin_transport, admin_listing, admin_funding,
 *   owner_listing, operator_speed, operator_ship, service_user
 *
 * Role color strategy (Batch 7a1 decision A):
 * - Admin roles map ke service color portal yang di-manage
 *   (admin_content → bakabar, admin_listing → bakos, dll)
 * - Non-admin roles pakai semantic service color
 * - super_admin → brand-teal (platform-wide access)
 *
 * Helpers di bawah (formatPhone, lastSeen, timeAgo) di-colocate di sini
 * karena tight coupling dengan user data. Kalau nanti dipakai luas,
 * move ke src/lib/format.ts.
 */

import type { ServiceKey } from '@/components/ui/badge';

/* ─── User entity (matches /admin/users response) ─── */

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
  last_login: string | null;
  listing_summary: Record<string, number> | null;
}

/* ─── Role enum (9 roles, match backend) ─── */

export type UserRole =
  | 'super_admin'
  | 'admin_content'
  | 'admin_transport'
  | 'admin_listing'
  | 'admin_funding'
  | 'owner_listing'
  | 'operator_speed'
  | 'operator_ship'
  | 'service_user';

/* ─── Portal group — what portal this role manages ─── */

export interface PortalGroup {
  label: string;
  /** Service key untuk color identity */
  service: ServiceKey;
}

/* ─── Role config — semantic mapping ke service colors ─── */

interface RoleConfig {
  label: string;
  /** Service key untuk badge color. undefined = neutral gray (service_user) */
  service: ServiceKey | null;
  /** Portal groups yg di-akses role ini */
  portals: PortalGroup[];
  /** Admin-level role? (untuk filter/guard) */
  isAdmin: boolean;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  super_admin: {
    label: 'Super Admin',
    service: null, // Special case — render dengan brand-teal
    portals: [{ label: 'Semua Portal', service: 'users' }],
    isAdmin: true,
  },
  admin_content: {
    label: 'Admin Konten',
    service: 'bakabar',
    portals: [
      { label: 'BAKABAR', service: 'bakabar' },
      { label: 'BALAPOR', service: 'balapor' },
    ],
    isAdmin: true,
  },
  admin_transport: {
    label: 'Admin Transport',
    service: 'bapasiar',
    portals: [{ label: 'BAPASIAR', service: 'bapasiar' }],
    isAdmin: true,
  },
  admin_listing: {
    label: 'Admin Listing',
    service: 'bakos',
    portals: [{ label: 'BAKOS', service: 'bakos' }],
    isAdmin: true,
  },
  admin_funding: {
    label: 'Admin Funding',
    service: 'badonasi',
    portals: [{ label: 'BADONASI', service: 'badonasi' }],
    isAdmin: true,
  },
  owner_listing: {
    label: 'Owner',
    service: 'properti',
    portals: [{ label: 'Mitra', service: 'properti' }],
    isAdmin: false,
  },
  operator_speed: {
    label: 'Operator Speed',
    service: 'bapasiar',
    portals: [{ label: 'Speedboat', service: 'bapasiar' }],
    isAdmin: false,
  },
  operator_ship: {
    label: 'Operator Kapal',
    service: 'bapasiar',
    portals: [{ label: 'Kapal', service: 'bapasiar' }],
    isAdmin: false,
  },
  service_user: {
    label: 'User Biasa',
    service: null, // Neutral gray
    portals: [{ label: 'Publik', service: 'kendaraan' }],
    isAdmin: false,
  },
};

/* ─── Role filter options untuk dropdown ─── */

export const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Semua Role' },
  { value: 'service_user', label: 'User Biasa' },
  { value: 'owner_listing', label: 'Owner' },
  { value: 'admin_content', label: 'Admin Konten' },
  { value: 'super_admin', label: 'Super Admin' },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' },
] as const;

/* ─── Role options untuk invite (super_admin excluded) ─── */

export const INVITABLE_ROLES = (Object.keys(ROLE_CONFIG) as UserRole[])
  .filter((r) => r !== 'super_admin')
  .map((r) => ({ value: r, label: ROLE_CONFIG[r].label }));

/* ─── Role options untuk assign (semua, including super_admin, tapi guarded) ─── */

export const ALL_ROLES = (Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => ({
  value: r,
  label: ROLE_CONFIG[r].label,
}));

/* ─── Helpers ─── */

/**
 * Format nomor WA Indonesia ke display format.
 * "628123456789" → "+62 812-3456-789"
 */
export function formatPhone(phone: string): string {
  if (phone.startsWith('62')) {
    const local = '0' + phone.slice(2);
    return (
      '+62 ' + local.slice(1, 4) + '-' + local.slice(4, 8) + '-' + local.slice(8)
    );
  }
  return phone;
}

/**
 * Last seen — relative time dari date string.
 * null → "Belum pernah"
 */
export function lastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Belum pernah';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  if (d < 30) return `${Math.floor(d / 7)} minggu lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

/**
 * Relative time — for "gabung X" context.
 * "Hari ini" / "Kemarin" / "N hari lalu" / "N bln lalu"
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

/**
 * Generate initial dari nama. Fallback "?".
 */
export function userInitial(user: Pick<User, 'name'>): string {
  if (!user.name) return '?';
  return user.name.charAt(0).toUpperCase();
}

/**
 * Display name — nama kalau ada, fallback ke formatted phone.
 */
export function userDisplayName(user: Pick<User, 'name' | 'phone'>): string {
  return user.name || formatPhone(user.phone);
}

/* ─── Stats derivation ─── */

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  neverLogin: number;
}

export function computeUserStats(users: User[], total: number): UserStats {
  return {
    total,
    active: users.filter((u) => u.is_active !== false).length,
    inactive: users.filter((u) => u.is_active === false).length,
    neverLogin: users.filter((u) => !u.last_login).length,
  };
}
