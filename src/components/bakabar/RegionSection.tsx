'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Section v11.0 (Phase 4 — House Data-Only + ADS)
// PATH: src/components/bakabar/RegionSection.tsx
// ────────────────────────────────────────────────────────────────
// v11.0 UPDATE (31 Mei 2026):
//   - CABUT slot Layanan + Zakat dari kolom-3. Filosofi: kartu house =
//     HANYA yang punya DATA REAL (Kampanye BADONASI + Suara Warga BALAPOR).
//     Promo/ajakan (Layanan, Zakat) → pindah ke jalur ADS (banner Canva).
//   - houseSlot: 'kampanye' | 'balapor' | 'ads'
//       kampanye → CampaignCol3Card (data real) + 1 banner ADS bawah
//       balapor  → SuaraWargaCol3Card (data real) + 1 banner ADS bawah
//       ads      → 2 banner ADS stack (inventory revenue, full slot)
//   - Kampanye/balapor tanpa data → otomatis jatuh ke 'ads' (no kartu kosong).
//   - StackLayananTeraLoka + ZakatCol3Card TIDAK lagi dipakai di sini
//     (komponennya dibiarkan ada — nganggur, cleanup terpisah).
//
// v10.8 PRIOR (31 Mei): +houseSlot 'balapor' (Suara Warga).
// v10.4 PRIOR (15 Mei): <DCAStackBanner /> fetch public.ads.
// v10.3 PRIOR (Mission 6): trendingAd inject idx=2 + ResizeObserver sync.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useEffect, useRef, useState, Fragment } from 'react';
import { ArrowRight, ArrowUpDown, BadgeCheck } from 'lucide-react';
import type { RegionConfig } from './region-data';
import WeatherWidget from '../shared/environment/WeatherWidget';
import TrendingArticleAd, { type TrendingNativeAd } from './TrendingArticleAd';
import DCAStackBanner from './DCAStackBanner';
import CampaignCol3Card, { type BadonasiCampaign } from './CampaignCol3Card';
import SuaraWargaCol3Card, { type BalaporReport } from './SuaraWargaCol3Card';

export type HouseSlot = 'kampanye' | 'balapor' | 'ads';

const REGION_BG: Record<string, string> = {
  't-nasional': 'linear-gradient(180deg, #003526 30%, #001a13 100%)',
  't-ternate':  'linear-gradient(180deg, #1e40af 30%, #1e3a8a 100%)',
  't-sofifi':   'linear-gradient(180deg, #14532d 30%, #052e16 100%)',
  't-tidore':   'linear-gradient(180deg, #be123c 30%, #881337 100%)',
  't-halbar':   'linear-gradient(180deg, #c2410c 30%, #7c2d12 100%)',
  't-halsel':   'linear-gradient(180deg, #831843 30%, #500724 100%)',
  't-halut':    'linear-gradient(180deg, #115e59 30%, #042f2e 100%)',
  't-halteng':  'linear-gradient(180deg, #5b21b6 30%, #2e1065 100%)',
  't-haltim':   'linear-gradient(180deg, #92400e 30%, #451a03 100%)',
  't-morotai':  'linear-gradient(180deg, #1e3a8a 30%, #172554 100%)',
  't-sula':     'linear-gradient(180deg, #7c2d12 30%, #431407 100%)',
  't-taliabu':  'linear-gradient(180deg, #6d28d9 30%, #2e1065 100%)',
  't-viral':    'linear-gradient(180deg, #dc2626 30%, #7f1d1d 100%)',
};

const THUMB_BG: Record<string, string> = {
  'thumb-1': 'linear-gradient(135deg, #be123c, #881337)',
  'thumb-2': 'linear-gradient(135deg, #c2410c, #7c2d12)',
  'thumb-3': 'linear-gradient(135deg, #14532d, #052e16)',
  'thumb-4': 'linear-gradient(135deg, #4c1d95, #5b21b6)',
  'thumb-5': 'linear-gradient(135deg, #1e40af, #1e3a8a)',
  'thumb-6': 'linear-gradient(135deg, #065f46, #064e3b)',
  'thumb-7': 'linear-gradient(135deg, #7c2d12, #431407)',
  'thumb-8': 'linear-gradient(135deg, #9f1239, #831843)',
  'thumb-9': 'linear-gradient(135deg, #075985, #0c4a6e)',
};

function formatShortDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} hari lalu` : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

type Props = {
  region:         RegionConfig;
  trendingAd?:    TrendingNativeAd | null;
  houseSlot?:     HouseSlot;                  // jenis zona atas kolom-3 (dari BakabarShell)
  houseCampaign?: BadonasiCampaign | null;    // data kampanye (kalau houseSlot='kampanye')
  houseReports?:  BalaporReport[];            // data laporan (kalau houseSlot='balapor')
  hideWeather?:   boolean;                    // section non-geografis (mis. Viral) → sembunyiin cuaca
};

export default function RegionSection({
  region,
  trendingAd = null,
  houseSlot = 'ads',
  houseCampaign = null,
  houseReports = [],
  hideWeather = false,
}: Props) {
  const {
    label, slug, short_label, gradient_class, featured, trending_list,
  } = region;

  const showWeather = slug !== 'nasional' && !hideWeather;

  // ResizeObserver Col 1 → Col 2/3 layout sync (v10.2 preserved)
  const col1Ref = useRef<HTMLDivElement>(null);
  const [col1Height, setCol1Height] = useState<number | null>(null);

  useEffect(() => {
    const el = col1Ref.current;
    if (!el) return;
    setCol1Height(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(entries => {
      setCol1Height(entries[0].contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showWeather]);

  const stretchStyle = col1Height ? { height: `${col1Height}px` } : undefined;

  // Zona atas kolom-3: data real butuh isi; kalau kosong → ADS murni (no kartu kosong)
  const showCampaign = houseSlot === 'kampanye' && !!houseCampaign;
  const showBalapor  = houseSlot === 'balapor' && houseReports.length > 0;

  return (
    <section className="my-12">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-[30px] rounded-sm" style={{ background: '#8B5CF6' }} />
          <h2 className="font-extrabold tracking-[-0.6px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 28 }}>
            {label}
          </h2>
        </div>
        <Link href={`/bakabar/kanal/${slug}`}
          className="text-[14px] font-bold flex items-center gap-1 hover:underline" style={{ color: '#378ADD' }}>
          Lihat semua
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      <div
        className="grid gap-5 items-start"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        }}
      >
        {/* Col 1: Height reference */}
        <div ref={col1Ref} className="flex flex-col gap-3 min-w-0">
          <div className="relative" style={{ aspectRatio: '4 / 5' }}>
            <Link
              href={`/bakabar/${featured.slug}`}
              className="absolute inset-0 cursor-pointer block rounded-lg overflow-hidden text-white"
              style={{ background: REGION_BG[gradient_class] || REGION_BG['t-nasional'] }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)' }} />
              <div className="absolute inset-0 z-[2] flex flex-col justify-end p-5">
                <h3 className="text-[20px] font-bold leading-[1.25] tracking-[-0.3px] mb-3 line-clamp-4"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}>
                  {featured.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] opacity-95">
                  <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: '#003526', fontFamily: "'Lora', Georgia, serif" }}>
                    B
                  </div>
                  <span className="truncate">BAKABAR {short_label}</span>
                  <BadgeCheck size={11} strokeWidth={2.4} className="opacity-70 shrink-0" />
                </div>
                <div className="text-[11px] mt-1.5 opacity-70">
                  {formatShortDate(featured.published_at)}
                </div>
              </div>
            </Link>
          </div>

          {showWeather && (
            <WeatherWidget regionSlug={slug} regionName={short_label} />
          )}
        </div>

        {/* Col 2: Trending */}
        <div className="relative min-w-0" style={stretchStyle}>
          <div
            className="rounded-lg bg-white overflow-hidden flex flex-col h-full"
            style={{ border: '1px solid #E5E7EB' }}
          >
            <div className="px-3.5 py-2.5 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-[3px] h-[16px] rounded-sm shrink-0" style={{ background: '#8B5CF6' }} />
                <div className="text-[14px] font-extrabold text-gray-900 truncate">
                  Trending di {short_label}
                </div>
              </div>
              {trending_list.length > 4 && (
                <div className="text-[10px] text-gray-400 flex items-center gap-0.5 tracking-[0.5px] font-semibold shrink-0">
                  <ArrowUpDown size={11} strokeWidth={2.4} />
                  scroll
                </div>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto"
              style={{ minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}
            >
              {trending_list.map((item, idx) => (
                <Fragment key={item.id}>
                  {idx === 2 && trendingAd && (
                    <TrendingArticleAd
                      ad={trendingAd}
                      regionSlug={slug}
                      short_label={short_label}
                    />
                  )}
                  <Link
                    href={`/bakabar/${item.slug}`}
                    className="flex gap-2.5 px-3.5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: idx < trending_list.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold leading-[1.4] text-gray-900 mb-1.5 line-clamp-2"
                        style={{ fontFamily: "'Lora', Georgia, serif" }}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ background: '#003526', fontFamily: "'Lora', Georgia, serif", fontWeight: 700, fontSize: 9 }}>
                          B
                        </div>
                        <span className="truncate">BAKABAR {short_label}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {timeAgo(item.published_at)}
                      </div>
                    </div>
                    <div className="w-[60px] h-[60px] rounded-md shrink-0"
                      style={{ background: THUMB_BG[item.thumb_class || 'thumb-1'] || THUMB_BG['thumb-1'] }} />
                  </Link>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: house data card (kalau ada) + slot ADS region_stack */}
        <div className="relative min-w-0" style={stretchStyle}>
          <div className="flex flex-col gap-2.5 h-full">

            {showCampaign ? (
              <>
                <CampaignCol3Card campaign={houseCampaign!} className="flex-1" />
                {/* 1 banner ADS di bawah kartu data */}
                <DCAStackBanner regionSlug={slug} maxAds={1} />
              </>
            ) : showBalapor ? (
              <>
                <SuaraWargaCol3Card reports={houseReports} className="flex-1" />
                <DCAStackBanner regionSlug={slug} maxAds={1} />
              </>
            ) : (
              /* ADS murni: 2 banner stack (eks slot Layanan/Zakat) */
              <DCAStackBanner regionSlug={slug} maxAds={2} />
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
