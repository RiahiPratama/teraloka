/**
 * TeraLoka — SOS Frontend Types
 * Bridge Sprint Day 12 Step 6 (10 Mei 2026)
 * ------------------------------------------------------------
 * Mirror backend types dari src/domains/balapor/emergency/emergency-types.ts.
 *
 * Reasoning duplicate types (instead of shared package):
 *   - Frontend & backend di repo terpisah (teraloka vs teraloka-api)
 *   - Pre-launch: tetap simple, manual sync saat backend type berubah
 *   - Future: extract ke shared package @teraloka/types kalau scale
 */

// ─── Backend Mirror Types ───────────────────────────────────

export type EmergencyType =
  | 'maritime'
  | 'fire'
  | 'security'
  | 'medical'
  | 'natural'
  | 'other';

export type GpsStatus =
  | 'available'
  | 'denied'
  | 'unavailable'
  | 'manual';

export type SosStatus =
  | 'pending'
  | 'acknowledged'
  | 'dispatched'
  | 'on_scene'
  | 'resolved'
  | 'false_alarm'
  | 'cancelled';

// ─── Submit Payload ─────────────────────────────────────────

export interface SubmitSosPayload {
  emergency_type: EmergencyType;
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  gps_status: GpsStatus;
  caller_phone?: string;
  note?: string;
  caller_consent_to_public?: boolean;
  // Honeypot — selalu kirim empty string
  website?: string;
}

// ─── Response from POST /balapor/sos ────────────────────────

export interface HotlineReminder {
  organization: string;
  number: string;
  note?: string;
}

export interface SosCallCreated {
  id: string;
  display_id: string;
  status: SosStatus;
  emergency_type: EmergencyType;
  expose_to_public_map: boolean;
  message: string;
  hotline_reminders: HotlineReminder[];
  created_at: string;
  _meta?: {
    admin_notified: boolean;
    authority_logged: number;
  };
}

// ─── UI Display Helpers ─────────────────────────────────────

/**
 * Emergency type metadata untuk Screen 1 selection.
 * Order penting — most-likely first untuk UX panic mode.
 */
export interface EmergencyTypeMeta {
  type: EmergencyType;
  label: string;
  description: string;
  iconName: string;       // Material Symbols icon name
  gradientFrom: string;   // Tailwind gradient start (e.g., 'from-blue-500')
  gradientTo: string;     // Tailwind gradient end (e.g., 'to-cyan-600')
  hoverRing: string;      // Hover ring color (e.g., 'hover:ring-blue-300')
}

export const EMERGENCY_TYPE_OPTIONS: readonly EmergencyTypeMeta[] = [
  {
    type: 'maritime',
    label: 'Kapal/Laut',
    description: 'Kapal karam, tenggelam, butuh evakuasi laut',
    iconName: 'directions_boat',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-600',
    hoverRing: 'hover:ring-blue-300',
  },
  {
    type: 'fire',
    label: 'Kebakaran',
    description: 'Rumah, kapal, atau hutan terbakar',
    iconName: 'local_fire_department',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-600',
    hoverRing: 'hover:ring-orange-300',
  },
  {
    type: 'medical',
    label: 'Medis Darurat',
    description: 'Butuh ambulans atau evakuasi medis segera',
    iconName: 'medical_services',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-600',
    hoverRing: 'hover:ring-rose-300',
  },
  {
    type: 'security',
    label: 'Keamanan',
    description: 'Perampokan, kekerasan, ancaman',
    iconName: 'local_police',
    gradientFrom: 'from-slate-700',
    gradientTo: 'to-slate-900',
    hoverRing: 'hover:ring-slate-400',
  },
  {
    type: 'natural',
    label: 'Bencana Alam',
    description: 'Banjir, longsor, gempa, tsunami',
    iconName: 'tsunami',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-blue-700',
    hoverRing: 'hover:ring-teal-300',
  },
  {
    type: 'other',
    label: 'Lainnya',
    description: 'Darurat lain yang butuh respons cepat',
    iconName: 'warning',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-600',
    hoverRing: 'hover:ring-amber-300',
  },
] as const;

// ─── GPS State for UI ───────────────────────────────────────

export type GpsCaptureState =
  | 'idle'        // belum request
  | 'requesting'  // browser API in-progress
  | 'success'     // got coordinates
  | 'denied'      // user denied permission
  | 'unavailable' // device tidak support
  | 'timeout';    // request timeout

export interface GpsCapture {
  state: GpsCaptureState;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  errorMessage?: string;
}

// ─── Modal Screen State ─────────────────────────────────────

export type SosModalScreen =
  | 'type-select'   // Screen 1: pilih jenis darurat
  | 'confirm'       // Screen 2: konfirmasi + GPS + note opsional
  | 'submitting'    // overlay loading saat submit
  | 'success'       // Screen 3: success + display_id + hotline reminders
  | 'error';        // overlay error kalau submit fail
