/**
 * TeraLoka — Locations Types (Frontend)
 * Pre-Sprint #0 Step 6 — Geographic Foundation Picker
 * ────────────────────────────────────────────────────────────
 * Types untuk consume backend /locations/* endpoints.
 * Mirror backend types di src/domains/shared/locations/locations-types.ts
 *
 * USAGE:
 *   import type {
 *     Location,
 *     LocationScope,
 *     LocationBreadcrumb,
 *     ReverseGeoResult,
 *   } from './locations-types';
 */

// ─── Core enum (matches DB CHECK constraint) ─────────────────

export type LocationType =
  | 'provinsi'
  | 'kabupaten'
  | 'kota'
  | 'kecamatan'
  | 'kelurahan'
  | 'desa';

export type Tier4Type = 'kelurahan' | 'desa';
export type Tier2Type = 'kabupaten' | 'kota';

// ─── API response shapes (1:1 dengan backend) ────────────────

/** Full location row dari public.locations */
export interface Location {
  id: string;
  name: string;
  slug: string;
  type: LocationType;
  parent_id: string | null;
  bps_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

/** Lightweight reference (untuk lookup, picker, breadcrumb) */
export interface LocationRef {
  id: string;
  name: string;
  type: LocationType;
}

/** Scope filter object — passed dari frontend ke backend filter */
export interface LocationScope {
  type: LocationType;
  id: string;
}

/** Tree node dari /locations/tree (recursive children) */
export interface LocationTreeNode extends Location {
  children?: LocationTreeNode[];
}

/** Breadcrumb dari /locations/breadcrumb/:id */
export interface LocationBreadcrumb {
  trail: LocationRef[];
  display: string;        // "Maluku Utara › Kota Ternate › Bastiong"
  display_short: string;  // "Bastiong, Ternate Selatan"
}

/** Reverse-geo result dari /locations/reverse-geo */
export interface ReverseGeoResult {
  location_id: string;
  name: string;
  type: LocationType;
  parent_id: string | null;
  distance_km: number;
  confidence: 'high' | 'medium' | 'low';
  parent_breadcrumb: string;
}

// ─── UI Labels (Bahasa Indonesia) ────────────────────────────

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  provinsi:  'Provinsi',
  kabupaten: 'Kabupaten',
  kota:      'Kota',
  kecamatan: 'Kecamatan',
  kelurahan: 'Kelurahan',
  desa:      'Desa',
};

export const LOCATION_TYPE_LABEL_PLURAL: Record<LocationType, string> = {
  provinsi:  'Provinsi',
  kabupaten: 'Kabupaten/Kota',
  kota:      'Kabupaten/Kota',
  kecamatan: 'Kecamatan',
  kelurahan: 'Kelurahan/Desa',
  desa:      'Kelurahan/Desa',
};

/** Material Symbols icon per type */
export const LOCATION_TYPE_ICON: Record<LocationType, string> = {
  provinsi:  'public',
  kabupaten: 'location_city',
  kota:      'apartment',
  kecamatan: 'domain',
  kelurahan: 'home',
  desa:      'home_work',
};

// ─── Provincial Capital metadata ─────────────────────────────

/**
 * SOFIFI = Ibu Kota Provinsi Maluku Utara.
 * Geographic: di daratan Pulau Halmahera (terpisah dari Pulau Tidore),
 * Administrasi: masuk Kota Tidore Kepulauan via Kec. Oba Utara.
 */
export const PROVINCIAL_CAPITAL_IDS: Record<string, { name: string; province: string }> = {
  '6bed370a-b2c5-43e4-87cd-aba43758871b': {
    name:     'Sofifi',
    province: 'Maluku Utara',
  },
};

export function isProvincialCapital(locationId: string): boolean {
  return locationId in PROVINCIAL_CAPITAL_IDS;
}

// ─── Brand Colors (default + service overrides) ──────────────

/**
 * Default TeraLoka brand color (citizen-facing).
 * Override via brandColor prop untuk admin per-service:
 *   - BALAPOR admin: '#DC2626' (red urgent)
 *   - BADONASI admin: '#EC4899' (pink)
 *   - BAKOS admin: '#F59E0B' (orange)
 */
export const DEFAULT_BRAND_COLOR = '#003526';
