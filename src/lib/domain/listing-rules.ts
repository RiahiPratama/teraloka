/**
 * Listing Rules — Tier calculation, verification, fee, anti-bypass
 * 
 * BAKOS TIER (auto dari harga):
 * ≤ 800k    → ekonomi (gratis + komisi 1 bulan)
 * 800k-1.5jt → menengah (gratis + komisi, premium upgrade opsional 100k)
 * > 1.5jt   → premium (wajib iklan 200k + komisi)
 */

export function getListingTier(price: number): {
  tier: 'ekonomi' | 'menengah' | 'premium';
  fee: number;
  label: string;
} {
  if (price <= 800_000) {
    return { tier: 'ekonomi', fee: 0, label: 'Ekonomi' };
  }
  if (price <= 1_500_000) {
    return { tier: 'menengah', fee: 0, label: 'Menengah' };
  }
  return { tier: 'premium', fee: 200_000, label: 'Premium' };
}

/**
 * JASA categories
 */
export const JASA_CATEGORIES = [
  'laundry', 'tukang', 'service_ac', 'pijat_bekam', 'bengkel_motor',
  'service_hp_laptop', 'art', 'catering_dekorasi', 'guru_privat', 'lainnya',
] as const;

export const JASA_CATEGORY_LABELS: Record<string, string> = {
  laundry: 'Laundry',
  tukang: 'Tukang',
  service_ac: 'Service AC',
  pijat_bekam: 'Pijat / Bekam',
  bengkel_motor: 'Bengkel Motor',
  service_hp_laptop: 'Service HP/Laptop',
  art: 'ART',
  catering_dekorasi: 'Catering & Dekorasi',
  guru_privat: 'Guru Privat',
  lainnya: 'Lainnya',
};

/**
 * Revenue model per listing type
 */
export const LISTING_REVENUE = {
  kos_ekonomi: { listingFee: 0, commission: '1 bulan sewa' },
  kos_menengah: { listingFee: 0, premiumUpgrade: 100_000, commission: '1 bulan sewa' },
  kos_premium: { listingFee: 200_000, commission: '1 bulan sewa' },
  properti_jual: { listingFee: 0, commission: '1% harga jual' },
  properti_sewa: { listingFee: 0, commission: '1 bulan sewa' },
  kendaraan_rental: { listingFee: 50_000, commission: null },
  kendaraan_jual: { listingFee: 0, commission: '2% harga jual' },
  jasa: { listingFee: 50_000, firstMonthFree: true, commission: null },
  edukazia: { listingFee: 0, commission: null },
};

/**
 * Check if listing is stale (no updates/refreshes)
 */
export function isStale(lastRefreshedAt: string | null, staleDays: number = 30): boolean {
  if (!lastRefreshedAt) return true;
  const diff = Date.now() - new Date(lastRefreshedAt).getTime();
  return diff > staleDays * 24 * 60 * 60 * 1000;
}

/**
 * Followup interval for anti-bypass
 */
export const FOLLOWUP_INTERVAL_DAYS = 7;
