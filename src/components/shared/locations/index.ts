/**
 * TeraLoka — Shared Locations Components
 * Pre-Sprint #0 Step 6 — Geographic Foundation Picker
 * ────────────────────────────────────────────────────────────
 * Public exports untuk consume cross-service.
 *
 * USAGE:
 *   import {
 *     GeographicScopePicker,
 *     useLocationTree,
 *     type LocationScope,
 *     type LocationBreadcrumb,
 *   } from '@/components/shared/locations';
 *
 * CONSUMERS (planned):
 *   - BALAPOR /lapor (citizen submit form)
 *   - BALAPOR /admin/balapor (admin filter scope)
 *   - BAKOS /owner/listing/* (kos location)
 *   - BAANTAR /owner/orders (pickup zone)
 *   - BAJASA /owner/services (service area)
 *   - BAKABAR /admin/articles (location tag)
 *   - BADONASI /admin/funding/campaigns (regional campaigns)
 */

// ─── Main Component ──────────────────────────────────────────
export { default as GeographicScopePicker } from './GeographicScopePicker';
export type { GeographicScopePickerProps } from './GeographicScopePicker';

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
