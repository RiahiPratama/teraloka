// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Server Wrapper  [L5-BAKABAR-REGION-SERVER]
// PATH: src/components/bakabar/RegionServer.tsx
// ────────────────────────────────────────────────────────────────
// WS-5d (13 Jun 2026 — Streaming Refactor):
//   Server Component async PER REGION. Tiap instance fetch artikel +
//   trending + stack region-nya sendiri (3 call paralel), lalu render
//   <RegionSection> (client, presentational — STRUKTUR 3 KOLOM + ADS +
//   house-slot TIDAK disentuh sama sekali). Dibungkus <Suspense> di
//   BelowFold → tiap region nyembur INDEPENDEN begitu datanya siap,
//   urut atas-ke-bawah, tanpa saling nge-block.
//
//   Artikel kosong → <EmptyRegion> (jujur, no dummy — editorial integrity,
//   dipindah dari BakabarShell lama, IDENTIK).
//
//   🛡️ §2 PRESERVED: fetchList pakai TIMEOUT_ARTICLE_MS (9s) di lib;
//      trending/stack pakai sekunder (3.5s). Cold-start aman, gak ada
//      "kosong palsu". Halbar (probe 1.75s) = region paling lama keisi.
// ════════════════════════════════════════════════════════════════

import RegionSection from './RegionSection';
import {
  fetchList,
  fetchTrendingForRegion,
  fetchStackForRegion,
  regionQuery,
  toRegionArticle,
  type HouseAssignment,
} from './bakabar-fetch';
import type { RegionConfig } from './region-data';

export default async function RegionServer({
  region,
  house,
}: {
  region: RegionConfig;
  house: HouseAssignment;
}) {
  // 3 fetch paralel khusus region ini. Artikel = 9s (lib), trending/stack = 3.5s.
  const [rawArts, trendingAd, stackAds] = await Promise.all([
    fetchList(regionQuery(region.slug), 8),
    fetchTrendingForRegion(region.slug),
    fetchStackForRegion(region.slug),
  ]);

  const real = rawArts.map(toRegionArticle);
  // Section kosong → sembunyikan total (collapse senyap). Bukan pesan "belum ada":
  // section berisi di bawahnya naik natural; urutan REGIONS (di BelowFold) tak diubah →
  // pas region ini nanti diisi, otomatis muncul lagi di posisi urutan aslinya.
  if (!real.length) return null;

  // Props ke RegionSection PERSIS sama kayak yang dulu dikirim BakabarShell.
  return (
    <RegionSection
      region={{ ...region, featured: real[0], trending_list: real.slice(1) }}
      trendingAd={trendingAd}
      stackAds={stackAds}
      houseSlot={house.slot}
      houseCampaign={house.campaign}
      houseReports={house.reports}
    />
  );
}
