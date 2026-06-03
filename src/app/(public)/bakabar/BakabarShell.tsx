'use client';

// ══════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE SHELL — Phase 4 Polish v14.5 (Client Interactivity)
// PATH: src/app/(public)/bakabar/BakabarShell.tsx
// ──────────────────────────────────────────────────────────────────
// v14.4 (31 Mei 2026): Layanan + Zakat dicabut dari kolom-3 (→ jalur ADS).
//   - houseSlotType: 'kampanye' | 'balapor' | 'ads'.
//   - Kampanye (idx 1,5,9) + BALAPOR (idx 2,6,10) = data real house card.
//   - Sisanya (6 section) = ADS murni (2 banner stack via RegionSection).
//
// v14.3 (31 Mei): + Suara Warga BALAPOR ke rotasi.
// v14.2 (31 Mei): fetch campaigns + orchestrate house content.
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
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';
import type { BadonasiCampaign } from '@/components/bakabar/CampaignCol3Card';
import type { BalaporReport } from '@/components/bakabar/SuaraWargaCol3Card';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Pola slot house content kolom-3 (zona atas) ──────────────────
// v14.4 (31 Mei): Layanan + Zakat DICABUT (→ jalur ADS banner Canva).
// House card = HANYA data real: Kampanye (idx 1,5,9) + BALAPOR (idx 2,6,10).
// Sisanya (idx 0,3,4,7,8,11) = 'ads' → 2 banner ADS stack di kolom-3.
// Ubah di sini buat ganti komposisi.
function houseSlotType(idx: number): HouseSlot {
  const mod = idx % 4;
  if (mod === 1) return 'kampanye';
  if (mod === 2) return 'balapor';
  return 'ads'; // mod 0 & 3 (eks Layanan + eks Zakat) → ADS murni
}

// Ambil `count` laporan dari `all` mulai `offset` (wrap), tanpa duplikat dalam 1 kartu.
function windowReports(all: BalaporReport[], offset: number, count = 3): BalaporReport[] {
  if (!all.length) return [];
  const n = Math.min(count, all.length);
  const out: BalaporReport[] = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

// ─── BADONASI Strategic Inline Promo (DICABUT 31 Mei) ─────────────
// v14.6: slot idx===1 sekarang pakai <DCAInlineBanner /> (posisi ADS
// `inline_banner`, money-first). Banner pink statis di-pensiun — donasi
// tetap hadir via kartu Kampanye kolom-3 + ticker BASUMBANG + /fundraising.

export default function BakabarShell({ slides }: { slides: HeroSlide[] }) {
  const [trendingAdsByRegion, setTrendingAdsByRegion] =
    useState<Record<string, TrendingNativeAd | null>>({});
  const [campaigns, setCampaigns] = useState<BadonasiCampaign[]>([]);
  const [reports, setReports] = useState<BalaporReport[]>([]);
  const [regionArticles, setRegionArticles] = useState<Record<string, DummyArticle[]>>({});

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
  // Artikel REAL per section (geo→location, nasional→type, viral→source). Non-blocking.
  const fetchRegionArticles = useCallback(async () => {
    const toDummy = (a: any, i: number): DummyArticle => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category || '',
      published_at: a.published_at || a.created_at || new Date().toISOString(),
      source_name: a.source_name,
      cover_image_url: a.cover_image_url ?? null,
      thumb_class: `thumb-${(i % 9) + 1}`,
    });
    const fetchOne = async (query: string): Promise<DummyArticle[]> => {
      try {
        const res = await fetch(`${API}/content/articles?${query}&limit=8`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) return data.data.map(toDummy);
      } catch { /* non-blocking */ }
      return [];
    };
    const targets: Array<[string, string]> = [
      ...REGIONS.map((r) => [
        r.slug,
        r.slug === 'nasional' ? 'type=nasional' : `location=${encodeURIComponent(r.slug)}`,
      ] as [string, string]),
      [VIRAL_MALUT.slug, 'source=social'],
    ];
    const entries = await Promise.all(
      targets.map(async ([slug, query]) => [slug, await fetchOne(query)] as const),
    );
    const map: Record<string, DummyArticle[]> = {};
    entries.forEach(([slug, arts]) => { if (arts.length) map[slug] = arts; });
    setRegionArticles(map);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { fetchRegionArticles(); }, [fetchRegionArticles]);

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

            {/* v14.7 (31 Mei): mt-8 DIBUANG → hero sejajar atas skyscraper saat
                top_leaderboard kosong. Jarak ke hero (saat banner ADA) dipindah
                ke DCATopLeaderboard (mb-8). */}
            <div>

              {/* Hero render LANGSUNG — slides selalu terisi (server / fallback statis) */}
              <HeroWithSidebar
                slides={slides}
                terpopuler={TERPOPULER_LIST}
              />

              {REGIONS.map((region, idx) => {
                const { slot, campaign, reports: slotReports } = houseAssignments[idx];
                const _real = regionArticles[region.slug];
                const liveRegion = _real && _real.length
                  ? { ...region, featured: _real[0], trending_list: _real.slice(1) }
                  : region;
                return (
                  <div key={region.slug}>
                    <RegionSection
                      region={liveRegion}
                      trendingAd={trendingAdsByRegion[region.slug] ?? null}
                      houseSlot={slot}
                      houseCampaign={campaign}
                      houseReports={slotReports}
                    />

                    {idx === 0 && <LaIndieMoviePoliticalBanner />}
                    {idx === 1 && <DCAInlineBanner />}
                  </div>
                );
              })}

              <LaIndieMovieServiceCarousel />

              {/* Section Viral Maluku Utara (kategori ke-3) — dummy data, visual-first.
                  Reuse RegionSection; hideWeather (non-geografis); kol-3 = ADS murni.
                  🛡️ label editorial manual, BUKAN is_viral engine. */}
              {(() => {
                const _vr = regionArticles[VIRAL_MALUT.slug];
                const _liveViral = _vr && _vr.length
                  ? { ...VIRAL_MALUT, featured: _vr[0], trending_list: _vr.slice(1) }
                  : VIRAL_MALUT;
                return <RegionSection region={_liveViral} houseSlot="ads" hideWeather />;
              })()}

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
