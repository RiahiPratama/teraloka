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

// ─── Empty-state region (no dummy) ────────────────────────────────
// Region tanpa artikel real → tampil jujur, BUKAN headline palsu yang
// 404 pas diklik (editorial integrity). IDENTIK dgn BakabarShell lama.
function EmptyRegion({ region }: { region: RegionConfig }) {
  return (
    <section className="my-12">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-[30px] rounded-sm" style={{ background: '#8B5CF6' }} />
          <h2
            className="font-extrabold tracking-[-0.6px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 28 }}
          >
            {region.label}
          </h2>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 px-6 text-center">
        <p className="text-[15px] font-semibold text-gray-600">
          Belum ada berita untuk wilayah {region.short_label}.
        </p>
        <p className="text-[13px] text-gray-400 mt-1">
          Tim redaksi sedang menyiapkan liputan. Cek lagi nanti, ya.
        </p>
      </div>
    </section>
  );
}

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
  if (!real.length) return <EmptyRegion region={region} />;

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
