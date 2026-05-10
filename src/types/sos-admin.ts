/**
 * TeraLoka — SOS Admin Types
 * Bridge Sprint Day 12 Step 7 Batch B1 (10 Mei 2026)
 * ------------------------------------------------------------
 * Mirror backend types dari src/domains/balapor/emergency/sos-admin.ts.
 *
 * Match pattern src/types/sos.ts (citizen-side) + src/types/reports.ts (admin reports).
 */

import type { EmergencyType, GpsStatus, SosStatus } from './sos';

// ─── AdminSosCall — Full Detail (no privacy filter) ────────────

export interface AuthorityLogEntry {
  instansi_id: string;
  organization_name: string;
  phone: string;
  status: string;
  provider: string;
  error?: string;
  attempted_at: string;
}

export interface AdminSosCall {
  id: string;
  display_id: string;
  caller_id: string | null;
  caller_phone: string | null;
  caller_phone_normalized: string | null;
  submitted_ip: string | null;
  submitted_user_agent: string | null;
  submitted_device: string | null;
  emergency_type: EmergencyType;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  gps_status: GpsStatus;
  note: string | null;
  status: SosStatus;
  expose_to_public_map: boolean;
  caller_consent_to_public: boolean | null;
  admin_notified_at: string | null;
  admin_acknowledged_by: string | null;
  admin_acknowledged_at: string | null;
  authority_dispatched_at: string | null;
  authority_dispatched_by: string | null;
  authority_notification_log: AuthorityLogEntry[] | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── List Filter ───────────────────────────────────────────────

export interface AdminSosListFilter {
  status?: SosStatus | 'all';
  emergency_type?: EmergencyType | 'all';
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdminSosListResult {
  data: AdminSosCall[];
  total: number;
  page_size: number;
  page_offset: number;
}

// ─── Stats ─────────────────────────────────────────────────────

export interface AdminSosStats {
  total_today: number;
  pending: number;
  acknowledged: number;
  dispatched: number;
  on_scene: number;
  resolved_today: number;
  false_alarm_today: number;
  cancelled_today: number;
  by_type_today: Record<EmergencyType, number>;
  recent_24h: number;
}

// ─── Update Action ─────────────────────────────────────────────

export type AdminSosAction =
  | 'acknowledge'
  | 'dispatch'
  | 'mark_on_scene'
  | 'resolve'
  | 'mark_false_alarm'
  | 'cancel'
  | 'toggle_expose';

export interface UpdateAdminSosInput {
  action: AdminSosAction;
  note?: string;
  expose?: boolean;
}

// ─── UI Helpers — Status Display Metadata ──────────────────────

import {
  Clock,
  Eye,
  Send,
  MapPin,
  CheckCircle2,
  Ban,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export interface StatusMeta {
  label: string;
  bgClass: string;     // background tailwind
  textClass: string;   // text color tailwind
  borderClass: string; // border tailwind
  Icon: LucideIcon;    // Lucide icon component (admin pattern)
}

export const STATUS_META: Record<SosStatus, StatusMeta> = {
  pending: {
    label: 'Menunggu',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    Icon: Clock,
  },
  acknowledged: {
    label: 'Diketahui',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    Icon: Eye,
  },
  dispatched: {
    label: 'Diteruskan',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    Icon: Send,
  },
  on_scene: {
    label: 'Di Lokasi',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    Icon: MapPin,
  },
  resolved: {
    label: 'Selesai',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    Icon: CheckCircle2,
  },
  false_alarm: {
    label: 'False Alarm',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-300',
    Icon: Ban,
  },
  cancelled: {
    label: 'Dibatalkan',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
    borderClass: 'border-gray-200',
    Icon: XCircle,
  },
};

/**
 * Active statuses (untuk filter/count).
 * Active = SOS yang masih dalam process, BUKAN final state.
 */
export const ACTIVE_STATUSES: SosStatus[] = [
  'pending',
  'acknowledged',
  'dispatched',
  'on_scene',
];

export function isActiveStatus(status: SosStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
