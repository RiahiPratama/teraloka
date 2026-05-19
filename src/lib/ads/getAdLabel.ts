/**
 * ════════════════════════════════════════════════════════════════════════
 * getAdLabel — Single source of truth untuk ad disclosure label
 * ────────────────────────────────────────────────────────────────────────
 * SESI 5E Phase 3c (19 Mei 2026) — Kumparan-style disclosure
 *
 * Rule (priority order):
 *   1. politisi      → "Iklan Kampanye"    (KPU PKPU compliance, MANDATORY)
 *   2. pemerintah    → "IKLAN"             (UU PERS Pasal 13, MANDATORY)
 *   3. ad_format text → "Advertorial"      (native article disclosure)
 *   4. else (banner image umum/komersial/premium) → null (natural, no label)
 *
 * Filosofi: 
 *   - Banner area umum = obvious ad slot → audience tau → label redundant
 *   - Native blend editorial / advertorial → MANDATORY disclosure
 *   - Politisi & Pemerintah → MANDATORY regardless of position/format
 *
 * Reference: Kumparan.com banner pattern — no label on commercial banners,
 *            explicit label on advertorial + government + political ads.
 * ════════════════════════════════════════════════════════════════════════
 */

export type AdvertiserType =
  | 'umum'
  | 'komersial'
  | 'premium'
  | 'pemerintah'
  | 'politisi';

export type AdFormat = 'image' | 'text';

export interface GetAdLabelParams {
  advertiser_type?: AdvertiserType | string | null;
  ad_format?: AdFormat | string | null;
}

/**
 * Decide ad disclosure label based on advertiser type + format.
 * Returns null untuk banner umum/komersial/premium (natural look).
 */
export function getAdLabel(params: GetAdLabelParams): string | null {
  const { advertiser_type, ad_format } = params;

  // Priority 1: politisi — KPU PKPU MANDATORY
  if (advertiser_type === 'politisi') return 'Iklan Kampanye';

  // Priority 2: pemerintah — UU PERS MANDATORY
  if (advertiser_type === 'pemerintah') return 'IKLAN';

  // Priority 3: advertorial text format — native article disclosure
  if (ad_format === 'text') return 'Advertorial';

  // Banner image dari umum/komersial/premium → no label (Kumparan pattern)
  return null;
}

/**
 * Helper: check if label is required (compliance flag).
 * Useful untuk styling decisions (e.g., pulse animation hanya untuk
 * mandatory disclosure types).
 */
export function isLabelMandatory(params: GetAdLabelParams): boolean {
  return (
    params.advertiser_type === 'politisi' ||
    params.advertiser_type === 'pemerintah'
  );
}
