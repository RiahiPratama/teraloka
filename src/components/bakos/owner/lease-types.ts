// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Lease (Penyewa) FE Types — mirror lease-engine.ts
// PATH: src/components/bakos/owner/lease-types.ts
// PENANDA: L5-FE-LEASE-TYPES
// ════════════════════════════════════════════════════════════════

export type LeaseStatus = 'aktif' | 'nunggak' | 'berakhir' | 'keluar';

export interface Lease {
  id: string;
  listing_id: string;
  room_id: string;
  tenant_name: string;
  tenant_phone: string;
  start_date: string;       // YYYY-MM-DD
  duration_months: number;
  end_date: string;         // YYYY-MM-DD
  rent_amount: number;
  deposit: number;
  due_day: number;          // 1..28
  status: LeaseStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  // enrich dari listLeases
  kos_title?: string | null;
  room_name?: string | null;
  last_reminded_at?: string | null;
}

export interface LeaseInput {
  listing_id: string;
  room_id: string;
  tenant_name: string;
  tenant_phone: string;
  start_date: string;
  duration_months: number;
  rent_amount: number;
  deposit?: number;
  due_day: number;
  note?: string | null;
}

// ─── Status → tampilan badge ───
export interface LeaseStatusView { label: string; bg: string; fg: string; }
export const LEASE_STATUS_VIEW: Record<LeaseStatus, LeaseStatusView> = {
  aktif:    { label: 'Aktif',    bg: '#E1F5EE', fg: '#04342C' },
  nunggak:  { label: 'Nunggak',  bg: '#FDECEC', fg: '#A32D2D' },
  berakhir: { label: 'Berakhir', bg: '#F1EFE8', fg: '#5F5E5A' },
  keluar:   { label: 'Keluar',   bg: '#F1EFE8', fg: '#888780' },
};

// penyewa yang masih menempati kamar (buat hitung okupansi)
export const OCCUPYING: LeaseStatus[] = ['aktif', 'nunggak'];
