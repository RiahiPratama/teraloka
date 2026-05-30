'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Section v10.6 (Phase 4 — Kolom-3 House Rotation)
// PATH: src/components/bakabar/RegionSection.tsx
// ────────────────────────────────────────────────────────────────
// v10.6 UPDATE (31 Mei 2026, Phase 4 — Tahap 1b):
//   - Kolom-3 zona ATAS jadi SLOT ROTASI house content.
//   - Terima prop `sectionIndex` → pilih jenis kartu:
//       Zakat   = tiap section ke-4 (idx 3, 7, 11)
//       Layanan = sisanya (promosi layanan kontekstual per-region)
//   - Pool sekarang: [promosi layanan, ajakan zakat].
//     Nanti nambah: kampanye BADONASI, suara warga BALAPOR.
//   - Ganti frekuensi Zakat? Ubah angka `4` di `isZakatSlot`.
//   - Zona BAWAH (DCAStackBanner slot iklan) + layout lain UNCHANGED.
//
// v10.5 PRIOR (31 Mei): single source kartu Layanan via StackLayananTeraLoka.
// v10.4 PRIOR (15 Mei): <DCAStackBanner /> fetch public.ads (DCA-ready).
// v10.3 PRIOR (Mission 6): trendingAd inject idx=2 + ResizeObserver sync.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useEffect, useRef, useState, Fragment } from 'react';
import { ArrowRight, ArrowUpDown, BadgeCheck } from 'lucide-react';
import type { RegionConfig } from './region-data';
import WeatherWidget from '../shared/environment/WeatherWidget';
import TrendingArticleAd, { type TrendingNativeAd } from './TrendingArticleAd';
import DCAStackBanner from './DCAStackBanner';
import StackLayananTeraLoka from './StackLayananTeraLoka';
import ZakatCol3Card from './ZakatCol3Card';

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
  region:        RegionConfig;
  trendingAd?:   TrendingNativeAd | null;
  sectionIndex?: number;            // posisi section di homepage (untuk rotasi house content)
};

export default function RegionSection({ region, trendingAd = null, sectionIndex = 0 }: Props) {
  const {
    label, slug, short_label, gradient_class, featured, trending_list,
    layanan_variant, layanan_body,
    // Note v10.4: stack_banner dari RegionConfig NO LONGER USED
    // (replaced with <DCAStackBanner /> fetch DB). Keep destructure
    // for backward compat saat region-data.ts cleanup nanti.
  } = region;

  // ─── Rotasi house content kolom-3 (zona atas) ───
  // Pola: Zakat tiap section ke-4 (idx 3, 7, 11). Ubah angka 4 untuk
  // ganti frekuensi. Sisanya = promosi layanan kontekstual per-region.
  const isZakatSlot = (sectionIndex + 1) % 4 === 0;

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

        {/* Col 3: Stack (house content rotasi + DCAStackBanner slot iklan) */}
        <div className="relative min-w-0" style={stretchStyle}>
          <div className="flex flex-col gap-2.5 h-full">

            {/* Zona ATAS = house content rotasi:
                Zakat tiap section ke-4, sisanya promosi layanan. */}
            {isZakatSlot ? (
              <ZakatCol3Card className="flex-1" />
            ) : (
              <StackLayananTeraLoka
                variant={layanan_variant}
                body={layanan_body}
                className="flex-1"
              />
            )}

            {/* Zona BAWAH = slot iklan (Mission 7-B-3): DCAStackBanner fetch public.ads */}
            <DCAStackBanner regionSlug={slug} />

          </div>
        </div>
      </div>
    </section>
  );
}
