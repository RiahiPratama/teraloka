'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Section v10.4 (Mission 7 Sub-Phase 7-B-3)
// PATH: src/components/bakabar/RegionSection.tsx
// ────────────────────────────────────────────────────────────────
// v10.4 UPDATE (15 Mei 2026, Mission 7 Sub-Phase 7-B-3):
//   - REPLACE inline hardcoded stack_banner Col 3 dengan
//     <DCAStackBanner regionSlug={slug} /> yang fetch dari public.ads
//   - DCA-ready: kalau ad punya creative_frames, auto rotate
//   - target_regions logic carry-over Mission 6 hotfix
//   - Empty state: gak ada ad untuk region → DCAStackBanner return null
//
// v10.3 PRIOR (Mission 6 Phase 5) — preserved unchanged:
//   - trendingAd prop, inject TrendingArticleAd di trending_list idx=2
//   - ResizeObserver v10.2 layout sync
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useEffect, useRef, useState, Fragment } from 'react';
import { ArrowRight, ArrowUpDown, BadgeCheck } from 'lucide-react';
import type { RegionConfig } from './region-data';
import { LAYANAN_LIST } from './region-data';
import WeatherWidget from '../shared/environment/WeatherWidget';
import TrendingArticleAd, { type TrendingNativeAd } from './TrendingArticleAd';
import DCAStackBanner from './DCAStackBanner';

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

const LAYANAN_GRADIENT: Record<string, string> = {
  bakos:    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  bapasiar: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
  badonasi: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  balapor:  'linear-gradient(135deg, #A21CAF 0%, #701A75 100%)',
};

const LAYANAN_BRAND: Record<string, string> = {
  bakos:    '#6D28D9',
  bapasiar: '#0369A1',
  badonasi: '#BE185D',
  balapor:  '#701A75',
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
  region:       RegionConfig;
  trendingAd?:  TrendingNativeAd | null;
};

export default function RegionSection({ region, trendingAd = null }: Props) {
  const {
    label, slug, short_label, gradient_class, featured, trending_list,
    layanan_variant, layanan_body,
    // Note v10.4: stack_banner dari RegionConfig NO LONGER USED
    // (replaced with <DCAStackBanner /> fetch DB). Keep destructure
    // for backward compat saat region-data.ts cleanup nanti.
  } = region;

  const layanan         = LAYANAN_LIST.find(l => l.variant === layanan_variant) || LAYANAN_LIST[0];
  const layananGradient = LAYANAN_GRADIENT[layanan_variant] || LAYANAN_GRADIENT.bakos;
  const layananBrand    = LAYANAN_BRAND[layanan_variant] || LAYANAN_BRAND.bakos;

  const showWeather = slug !== 'nasional';

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
        <Link href={`/bakabar?nav=${slug}`}
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

        {/* Col 3: Stack (Layanan + DCAStackBanner replace hardcoded) */}
        <div className="relative min-w-0" style={stretchStyle}>
          <div className="flex flex-col gap-2.5 h-full">

            {/* Layanan card (unchanged, internal TeraLoka link) */}
            <Link
              href={layanan.href}
              className="flex-1 rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer group"
              style={{ background: layananGradient, minHeight: 0 }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 85% 100%, rgba(255,255,255,0.2) 0%, transparent 60%)',
              }} />
              <div className="absolute z-[1] pointer-events-none"
                style={{ top: 6, right: 8, fontSize: 32, opacity: 0.2 }}>
                {layanan.icon}
              </div>
              <div className="relative z-[2] flex-1 flex flex-col min-h-0">
                <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85">
                  Layanan TeraLoka
                </p>
                <h3 className="text-[17px] font-extrabold leading-[1] mb-1.5 tracking-[-0.4px]"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}>
                  {layanan.name}
                </h3>
                <p className="text-[10px] leading-[1.35] opacity-90 line-clamp-2 mb-auto">
                  {layanan_body}
                </p>
                <span className="self-start mt-1.5 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
                  style={{ background: '#fff', color: layananBrand }}>
                  {layanan.cta_label}
                  <ArrowRight size={9} strokeWidth={2.8} />
                </span>
              </div>
            </Link>

            {/* Mission 7-B-3: replace hardcoded stack_banner → DCAStackBanner */}
            <DCAStackBanner regionSlug={slug} />

          </div>
        </div>
      </div>
    </section>
  );
}
