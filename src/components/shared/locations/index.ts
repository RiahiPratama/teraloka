/**
 * TeraLoka — Shared Locations Components
 * Pre-Sprint #0 Step 6 — Geographic Foundation Picker
 * SESI 5A SUB-BATCH GEO (18 Mei 2026) — +LocationAutocomplete
 * ────────────────────────────────────────────────────────────
 * Public exports untuk consume cross-service.
 *
 * USAGE:
 *   import {
 *     GeographicScopePicker,
 *     LocationAutocomplete,
 *     useLocationTree,
 *     useLocationSearch,
 *     type LocationScope,
 *     type LocationBreadcrumb,
 *   } from '@/components/shared/locations';
 *
 * CONSUMERS (planned):
 *   - BALAPOR /lapor (citizen submit form) → GeographicScopePicker
 *   - BALAPOR /admin/balapor (admin filter scope) → GeographicScopePicker
 *   - BAKOS /owner/bakos/* (kos location) → GeographicScopePicker
 *   - BAANTAR /owner/orders (pickup zone) → GeographicScopePicker
 *   - BAJASA /owner/services (service area) → GeographicScopePicker
 *   - BAKABAR /admin/articles (location tag) → GeographicScopePicker
 *   - BADONASI /admin/funding/campaigns (regional campaigns) → GeographicScopePicker
 *   - ADS /admin/ads (advertiser business address) → LocationAutocomplete (text-only)
 */

// ─── Main Components ──────────────────────────────────────────
export { default as GeographicScopePicker } from './GeographicScopePicker';
export type { GeographicScopePickerProps } from './GeographicScopePicker';

export { default as LocationAutocomplete } from './LocationAutocomplete';
export type { LocationAutocompleteProps } from './LocationAutocomplete';

// ─── Types ───────────────────────────────────────────────────
export type {
  LocationType,
  Tier4Type,
  Tier2Type,
  Location,
  LocationRef,
  LocationScope,
  LocationTreeNode,
  LocationBreadcrumb,
  ReverseGeoResult,
} from './locations-types';

// ─── Constants ───────────────────────────────────────────────
export {
  LOCATION_TYPE_LABEL,
  LOCATION_TYPE_LABEL_PLURAL,
  LOCATION_TYPE_ICON,
  PROVINCIAL_CAPITAL_IDS,
  isProvincialCapital,
  DEFAULT_BRAND_COLOR,
} from './locations-types';

// ─── Hooks ───────────────────────────────────────────────────
export {
  useLocationTree,
  useLocationChildren,
  useLocationSearch,
  useLocationBreadcrumb,
  useReverseGeo,
} from './use-locations';
