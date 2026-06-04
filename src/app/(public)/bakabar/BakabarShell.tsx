'use client';

// ══════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE SHELL — Phase 4 Polish v15.0 (Client Interactivity)
// PATH: src/app/(public)/bakabar/BakabarShell.tsx
// ──────────────────────────────────────────────────────────────────
// v15.0 (4 Juni 2026, WS-3 — Region Wire-Up Server-Side):
//   - Artikel REGION + VIRAL sekarang DITERIMA dari server (props
//     `regionArticles` + `viralArticles`), BUKAN client-fetch lagi.
//     → Hilangkan flash dummy→real + cegah klik dummy 404 di Ternate.
//   - Region tanpa artikel = EMPTY-STATE jujur (<EmptyRegion/>), BUKAN
//     fallback dummy palsu. Editorial integrity > visual lengkap.
//   - Viral tanpa artikel = section di-skip (null), bukan dummy.
//   - PRESERVED (tetap client, non-blocking, below-fold): trendingAds,
//     campaigns (BADONASI), reports (BALAPOR), houseAssignments.
//
// v14.4 (31 Mei): Layanan + Zakat dicabut dari kolom-3 (→ jalur ADS).
//   - houseSlotType: 'kampanye' | 'balapor' | 'ads'.
//   - Kampanye (idx 1,5,9) + BALAPOR (idx 2,6,10) = data real house card.
// v14.0 (31 Mei): Opsi B RSC split — hero render dari server slides.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useMemo } from 'react';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection, { type HouseSlot } from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import DCAInlineBanner from '@/components/bakabar/DCAInlineBanner';
import DCASkyscraper from '@/components/bakabar/DCASkyscraper';
import DCATopLeaderboard from '@/components/bakabar/DCATopLeaderboard';
import { TERPOPULER_LIST, REGIONS } from '@/components/bakabar/region-data';
import { VIRAL_MALUT } from '@/components/bakabar/viral-malut-data';
import type { HeroSlide, DummyArticle, RegionConfig } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';
import type { BadonasiCampaign } from '@/components/bakabar/CampaignCol3Card';
import type { BalaporReport } from '@/components/bakabar/SuaraWargaCol3Card';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Pola slot house content kolom-3 (zona atas) ──────────────────
// House card = HANYA data real: Kampanye (idx 1,5,9) + BALAPOR (idx 2,6,10).
// Sisanya (idx 0,3,4,7,8,11) = 'ads' → 2 banner ADS stack di kolom-3.
function houseSlotType(idx: number): HouseSlot {
  const mod = idx % 4;
  if (mod === 1) return 'kampanye';
  if (mod === 2) return 'balapor';
  return 'ads'; // mod 0 & 3 → ADS murni
}

// Ambil `count` laporan dari `all` mulai `offset` (wrap), tanpa duplikat dalam 1 kartu.
function windowReports(all: BalaporReport[], offset: number, count = 3): BalaporReport[] {
  if (!all.length) return [];
  const n = Math.min(count, all.length);
  const out: BalaporReport[] = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

// ─── Empty-state region (no dummy) ────────────────────────────────
// v15.0: pengganti fallback dummy. Region tanpa artikel real → tampil
// jujur, BUKAN headline palsu yang 404 pas diklik (editorial integrity).
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

export default function BakabarShell({
  slides,
  regionArticles,
  viralArticles,
}: {
  slides: HeroSlide[];
  regionArticles: Record<string, DummyArticle[]>;
  viralArticles: DummyArticle[];
}) {
  const [trendingAdsByRegion, setTrendingAdsByRegion] =
    useState<Record<string, TrendingNativeAd | null>>({});
  const [campaigns, setCampaigns] = useState<BadonasiCampaign[]>([]);
  const [reports, setReports] = useState<BalaporReport[]>([]);

  // Trending ads = client-fetch, NON-BLOCKING. Tidak menahan hero.
  const fetchTrendingAds = useCallback(async () => {
    try {
      const results = await Promise.all(
        REGIONS.map(async (r) => {
          try {
            const res = await fetch(
              `${API}/public/ads/by-position/trending_native?region=${encodeURIComponent(r.slug)}&limit=1`
            );
            const data = await res.json();
            const ad =
              data?.success && Array.isArray(data.data) && data.data[0]
                ? (data.data[0] as TrendingNativeAd)
                : null;
            return [r.slug, ad] as const;
          } catch {
            return [r.slug, null] as const;
          }
        })
      );
      const map: Record<string, TrendingNativeAd | null> = {};
      results.forEach(([slug, ad]) => { map[slug] = ad; });
      setTrendingAdsByRegion(map);
    } catch {
      setTrendingAdsByRegion({});
    }
  }, []);

  // Kampanye BADONASI = client-fetch sekali, non-blocking (below-fold).
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`${API}/funding/campaigns?limit=12`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setCampaigns(data.data as BadonasiCampaign[]);
      }
    } catch {
      setCampaigns([]);
    }
  }, []);

  // Laporan BALAPOR verified = client-fetch sekali, non-blocking.
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${API}/public/reports/recent`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setReports(data.data as BalaporReport[]);
      }
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => { fetchTrendingAds(); }, [fetchTrendingAds]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Assign jenis slot + data per section (round-robin untuk kampanye & balapor).
  const houseAssignments = useMemo(() => {
    let k = 0; // counter slot kampanye
    let b = 0; // counter slot balapor
    return REGIONS.map((_, idx) => {
      const slot = houseSlotType(idx);
      let campaign: BadonasiCampaign | null = null;
      let slotReports: BalaporReport[] = [];
      if (slot === 'kampanye') {
        campaign = campaigns.length ? campaigns[k % campaigns.length] : null;
        k++;
      } else if (slot === 'balapor') {
        slotReports = windowReports(reports, b * 3, 3);
        b++;
      }
      return { slot, campaign, reports: slotReports };
    });
  }, [campaigns, reports]);

  // Section viral: pakai artikel server; skip kalau kosong (no dummy).
  const liveViral: RegionConfig | null =
    viralArticles && viralArticles.length
      ? { ...VIRAL_MALUT, featured: viralArticles[0], trending_list: viralArticles.slice(1) }
      : null;

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex gap-5 items-start justify-center pt-3">

          <DCASkyscraper side="left" />

          <main className="flex-1 min-w-0" style={{ maxWidth: 1000 }}>

            <DCATopLeaderboard />

            <div>

              {/* Hero render LANGSUNG — slides selalu terisi (server / fallback statis) */}
              <HeroWithSidebar
                slides={slides}
                terpopuler={TERPOPULER_LIST}
              />

              {REGIONS.map((region, idx) => {
                const { slot, campaign, reports: slotReports } = houseAssignments[idx];
                const real = regionArticles[region.slug];
                return (
                  <div key={region.slug}>
                    {real && real.length ? (
                      <RegionSection
                        region={{ ...region, featured: real[0], trending_list: real.slice(1) }}
                        trendingAd={trendingAdsByRegion[region.slug] ?? null}
                        houseSlot={slot}
                        houseCampaign={campaign}
                        houseReports={slotReports}
                      />
                    ) : (
                      <EmptyRegion region={region} />
                    )}

                    {idx === 0 && <LaIndieMoviePoliticalBanner />}
                    {idx === 1 && <DCAInlineBanner />}
                  </div>
                );
              })}

              <LaIndieMovieServiceCarousel />

              {/* Section Viral Maluku Utara — artikel real dari server (source=social).
                  Reuse RegionSection; hideWeather (non-geografis); kol-3 = ADS murni.
                  🛡️ label editorial manual, BUKAN is_viral engine. Skip kalau kosong. */}
              {liveViral && (
                <RegionSection region={liveViral} houseSlot="ads" hideWeather />
              )}

              <div className="my-10">
                <WANewsletterWidget />
              </div>

            </div>
          </main>

          <DCASkyscraper side="right" />

        </div>
      </div>
    </div>
  );
}
