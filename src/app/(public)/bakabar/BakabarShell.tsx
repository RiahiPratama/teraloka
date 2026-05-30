'use client';

// ══════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE SHELL — Phase 4 Polish v14.3 (Client Interactivity)
// PATH: src/app/(public)/bakabar/BakabarShell.tsx
// ──────────────────────────────────────────────────────────────────
// v14.3 (31 Mei 2026, Tahap 3): tambah Suara Warga BALAPOR ke rotasi.
//   - Fetch GET /public/reports/recent (1x, client, non-blocking).
//   - houseSlotType(idx) pola idx%4: 0=Layanan, 1=Kampanye, 2=BALAPOR, 3=Zakat
//     → rata 3 slot masing-masing dari 12 section.
//   - BALAPOR slot dapet window 3 laporan (round-robin offset).
//   - Slot kampanye/balapor fallback ke promosi layanan kalau data kosong.
//
// v14.2 (31 Mei): fetch campaigns + orchestrate rotasi house content.
// v14.0 (31 Mei): Opsi B RSC split — hero render langsung dari server slides.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection, { type HouseSlot } from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import DCASkyscraper from '@/components/bakabar/DCASkyscraper';
import DCATopLeaderboard from '@/components/bakabar/DCATopLeaderboard';
import { SIDEBAR_MREC, TERPOPULER_LIST, REGIONS } from '@/components/bakabar/region-data';
import type { HeroSlide } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';
import type { BadonasiCampaign } from '@/components/bakabar/CampaignCol3Card';
import type { BalaporReport } from '@/components/bakabar/SuaraWargaCol3Card';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Pola rotasi house content kolom-3 (zona atas) ────────────────
// idx % 4: 0 = Layanan, 1 = Kampanye, 2 = BALAPOR, 3 = Zakat.
// Rata 3 slot masing-masing dari 12 section. Ubah di sini buat ganti komposisi.
function houseSlotType(idx: number): HouseSlot {
  const mod = idx % 4;
  if (mod === 1) return 'kampanye';
  if (mod === 2) return 'balapor';
  if (mod === 3) return 'zakat';
  return 'layanan';
}

// Ambil `count` laporan dari `all` mulai `offset` (wrap), tanpa duplikat dalam 1 kartu.
function windowReports(all: BalaporReport[], offset: number, count = 3): BalaporReport[] {
  if (!all.length) return [];
  const n = Math.min(count, all.length);
  const out: BalaporReport[] = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

// ─── BADONASI Strategic Inline Promo (unchanged) ──────────────────
function BadonasiInlinePromo() {
  return (
    <Link
      href="/fundraising"
      className="relative block my-8 rounded-lg overflow-hidden text-white cursor-pointer transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
        boxShadow: '0 6px 20px rgba(157, 23, 77, 0.25)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 50%)',
      }} />
      <div className="absolute pointer-events-none" style={{
        right: -10, bottom: -20, fontSize: 110, opacity: 0.16, lineHeight: 1,
      }}>🤲</div>
      <div className="relative z-[2] p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase opacity-85 mb-1.5">
            BADONASI · Layanan TeraLoka
          </p>
          <h3 className="text-[18px] md:text-[22px] font-extrabold leading-tight mb-1"
            style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Galang Donasi untuk Sesama Warga MalUt
          </h3>
          <p className="text-[12px] opacity-90">
            Bantu kebutuhan mendesak warga di kampungmu — donasi mudah, transparan, langsung sampai.
          </p>
        </div>
        <span className="inline-block bg-white text-pink-700 px-4 py-2 rounded-md text-[11px] font-extrabold uppercase tracking-[0.5px] whitespace-nowrap self-start md:self-auto">
          Berdonasi →
        </span>
      </div>
    </Link>
  );
}

export default function BakabarShell({ slides }: { slides: HeroSlide[] }) {
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

            <div className="mt-8">

              {/* Hero render LANGSUNG — slides selalu terisi (server / fallback statis) */}
              <HeroWithSidebar
                slides={slides}
                sidebar_mrec={SIDEBAR_MREC}
                terpopuler={TERPOPULER_LIST}
              />

              {REGIONS.map((region, idx) => {
                const { slot, campaign, reports: slotReports } = houseAssignments[idx];
                return (
                  <div key={region.slug}>
                    <RegionSection
                      region={region}
                      trendingAd={trendingAdsByRegion[region.slug] ?? null}
                      houseSlot={slot}
                      houseCampaign={campaign}
                      houseReports={slotReports}
                    />

                    {idx === 0 && <LaIndieMoviePoliticalBanner />}
                    {idx === 1 && <BadonasiInlinePromo />}
                  </div>
                );
              })}

              <LaIndieMovieServiceCarousel />

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
