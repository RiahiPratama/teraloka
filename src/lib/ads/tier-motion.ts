// ════════════════════════════════════════════════════════════════
// TeraLoka ADS — Tier → Motion Resolver
// PATH: src/lib/ads/tier-motion.ts
// ────────────────────────────────────────────────────────────────
// SESI 11 (30 Mei 2026) — Gerbang "Dinamis" by pricing tier.
//
// "Dinamis" (iklan gerak) dikunci oleh pricing tier:
//   - 'none'  → tier ini cuma boleh Gambar (statis/GIF). Ember Dinamis terkunci.
//   - 'dca'   → boleh banner gonta-ganti (DCA, judul off). Cocok UMKM (ringan).
//   - 'video' → boleh video .webM/.mp4 per-posisi. Tier menengah-premium.
//
// Sumber kebenaran (2 lapis):
//   1. Per-tier eksplisit: tier.features.motion ('none'|'dca'|'video') kalau di-set.
//   2. Fallback default per kategori (LOCKED founder 30 Mei 2026) kalau features kosong.
//      → zero-DB-migration: out-of-the-box langsung jalan. Override per-tier nanti
//        cukup set features.motion di baris tier tertentu.
// ════════════════════════════════════════════════════════════════

import type {
  PricingTier,
  TierCategory,
} from '@/components/admin/ads/pricing-tiers/PricingTierPicker';

export type TierMotion = 'none' | 'dca' | 'video';

// Default per kategori — LOCKED founder 30 Mei 2026.
const CATEGORY_DEFAULT_MOTION: Record<TierCategory, TierMotion> = {
  umkm:            'dca',
  local_corporate: 'video',
  premium:         'video',
  politik:         'video',
  pemerintah:      'video',
};

function isTierMotion(v: unknown): v is TierMotion {
  return v === 'none' || v === 'dca' || v === 'video';
}

/**
 * Resolve motion yang diizinkan untuk satu tier.
 *   - null/undefined → 'none' (belum pilih paket → Dinamis terkunci)
 *   - tier.features.motion eksplisit → pakai itu
 *   - else → default per kategori
 */
export function resolveTierMotion(tier: PricingTier | null | undefined): TierMotion {
  if (!tier) return 'none';

  const explicit =
    tier.features && typeof tier.features === 'object'
      ? (tier.features as Record<string, unknown>).motion
      : undefined;
  if (isTierMotion(explicit)) return explicit;

  return CATEGORY_DEFAULT_MOTION[tier.tier_category] ?? 'none';
}

/** Label pendek bahasa Indonesia untuk motion. */
export function motionLabel(m: TierMotion): string {
  switch (m) {
    case 'video': return 'Video .webM / .mp4';
    case 'dca':   return 'Banner gonta-ganti';
    case 'none':  return 'Tidak tersedia';
  }
}
