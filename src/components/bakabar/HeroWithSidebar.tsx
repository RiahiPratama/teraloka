'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Hero + Sidebar v3.1 (Phase 4 Polish — Hydration-Safe Time)
// PATH: src/components/bakabar/HeroWithSidebar.tsx
// ────────────────────────────────────────────────────────────────
// v3.1 (31 Mei 2026): FIX hydration mismatch.
//   - Komponen ini sekarang ikut SSR (Opsi B: hero render di server).
//   - timeAgo() pakai Date.now() → beda nilai server vs client untuk
//     data dummy (region-data.ts pakai Date.now() di module-load).
//   - SOLUSI: render waktu relatif HANYA setelah mount (client).
//     SSR + first paint = tanpa waktu; muncul setelah hydrate. No mismatch.
//
// v3 PRIOR (Sub-Sprint 5D): full-area carousel Kumparan-style — UNCHANGED.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide, DummyArticle } from './region-data';
// SESI 11 (31 Mei 2026): MREC homepage = iklan ASLI dari ADS (posisi sidebar)
import AdSidebarSlug from '@/components/public/ads/AdSidebarSlug';

type Props = {
  slides: HeroSlide[];
  terpopuler: DummyArticle[];
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

const HERO_BG_GRADIENTS = [
  'linear-gradient(135deg, rgba(0,53,38,0.85) 0%, rgba(8,145,178,0.6) 100%), linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
  'linear-gradient(135deg, rgba(124,45,18,0.85) 0%, rgba(202,138,4,0.6) 100%), linear-gradient(135deg, #7c2d12 0%, #92400e 50%, #b45309 100%)',
  'linear-gradient(135deg, rgba(20,83,45,0.85) 0%, rgba(101,163,13,0.6) 100%), linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
];

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

// ─── Single Slide (Hero + 2 mini cards) ────────────────────────
// `mounted` di-pass dari parent → waktu relatif cuma render di client.
function HeroSlideContent({ slide, slideIdx, mounted }: { slide: HeroSlide; slideIdx: number; mounted: boolean }) {
  const { hero, secondary } = slide;
  const heroGradient = HERO_BG_GRADIENTS[slideIdx % HERO_BG_GRADIENTS.length];

  return (
    <div className="w-full shrink-0">
      {/* BIG Hero block */}
      <Link href={`/bakabar/${hero.slug}`} className="block group cursor-pointer">

        {/* BIG image */}
        <div className="w-full relative rounded-md overflow-hidden mb-5" style={{ aspectRatio: '16 / 9' }}>
          {hero.cover_image_url ? (
            <img src={hero.cover_image_url} alt={hero.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full relative" style={{ background: heroGradient }}>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 80% at 50% 70%, rgba(255,255,255,0.25) 0%, transparent 50%), radial-gradient(ellipse 40% 40% at 30% 30%, rgba(245,158,11,0.4) 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 70% 40%, rgba(149,211,186,0.3) 0%, transparent 50%)',
              }} />
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

          <div className="absolute top-4 left-4 z-[3] flex gap-2">
            {hero.category && (
              <span className="backdrop-blur-md px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#EF4444' }}>
                {hero.category}
              </span>
            )}
            {hero.is_viral && (
              <span className="px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1"
                style={{ background: '#F59E0B', color: '#fff' }}>
                🔥 Viral
              </span>
            )}
          </div>

          <p className="absolute bottom-4 left-6 z-[3] text-white text-[11px] italic opacity-85">
            Foto: BAKABAR / Maluku Utara
          </p>
        </div>

        {/* Title + Excerpt + Meta */}
        <h1 className="font-bold tracking-[-0.7px] text-gray-900 mb-3 group-hover:text-[#003526] transition-colors"
          style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 30, lineHeight: 1.2 }}>
          {hero.title}
        </h1>
        {hero.excerpt && (
          <p className="text-[15px] leading-[1.6] text-gray-600 mb-3.5" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            {hero.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 text-[12px] text-gray-400">
          <span className="text-gray-700 font-semibold">
            {hero.source === 'rss' ? (hero.source_name || 'Media Nasional') : 'Redaksi BAKABAR'}
          </span>
          {mounted && (
            <>
              <span className="text-gray-300">·</span>
              <span>{timeAgo(hero.published_at)}</span>
            </>
          )}
        </div>
      </Link>

      {/* Divider */}
      <div className="mt-5 pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>

        {/* 2 Mini cards bottom */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {secondary.map((a) => (
            <Link key={a.id} href={`/bakabar/${a.slug}`} className="block group cursor-pointer">
              <div className="w-full rounded-md overflow-hidden mb-2.5 relative"
                style={{ aspectRatio: '16 / 9', background: THUMB_BG[a.thumb_class || 'thumb-3'] || THUMB_BG['thumb-3'] }}>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 50%)',
                }} />
                {a.category && (
                  <span className="absolute top-2 left-2 z-[2] backdrop-blur-md px-2 py-0.5 rounded-sm text-[9px] font-extrabold tracking-widest uppercase"
                    style={{ background: 'rgba(255,255,255,0.95)', color: '#EF4444' }}>
                    {a.category}
                  </span>
                )}
              </div>
              <h4 className="text-[14px] font-bold leading-[1.3] tracking-[-0.2px] text-gray-900 mb-1.5 line-clamp-3 group-hover:text-[#003526] transition-colors"
                style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
                {a.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="text-gray-700 font-semibold">
                  {a.source === 'rss' ? (a.source_name || 'Media Nasional') : 'Redaksi BAKABAR'}
                </span>
                {mounted && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{timeAgo(a.published_at)}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main HeroWithSidebar ─────────────────────────────────────
export default function HeroWithSidebar({ slides, terpopuler }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Hydration-safe time: waktu relatif baru dihitung setelah mount (client).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const totalSlides = slides.length;

  const goPrev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1));
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === totalSlides - 1;

  return (
    <div className="grid gap-7 mb-10" style={{ gridTemplateColumns: '1fr 320px' }}>

      {/* ─── LEFT: Carousel (entire Hero area) ──────────────── */}
      <div className="min-w-0 relative">

        {/* Slider viewport */}
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-400 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {slides.map((slide, idx) => (
              <HeroSlideContent key={idx} slide={slide} slideIdx={idx} mounted={mounted} />
            ))}
          </div>
        </div>

        {/* Arrow nav overlay — positioned at top-center of slides (within BIG image area) */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="absolute z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
          style={{
            left: 10,
            top: 145,
            transform: 'translateY(-50%)',
            background: isFirst ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            color: isFirst ? '#D1D5DB' : '#1F2937',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
          aria-label="Slide sebelumnya"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        <button
          onClick={goNext}
          disabled={isLast}
          className="absolute z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
          style={{
            right: 10,
            top: 145,
            transform: 'translateY(-50%)',
            background: isLast ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            color: isLast ? '#D1D5DB' : '#1F2937',
            cursor: isLast ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
          aria-label="Slide berikutnya"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>

        {/* Dots indicator below carousel */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className="rounded-full transition-all"
              style={{
                width: idx === currentSlide ? 24 : 8,
                height: 8,
                background: idx === currentSlide ? '#003526' : '#D1D5DB',
              }}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ─── RIGHT: Sidebar 320px (STATIC, gak ikut slide) ──── */}
      <div className="flex flex-col gap-4">

        {/* MREC Ad — SESI 11 (31 Mei): dummy "Tabungan Dana Bahari" diganti
            iklan ASLI dari ADS (posisi `sidebar`). Kosong → fallback placeholder
            netral. Iklan FREE "Pasang Iklan" / berbayar muncul di sini. */}
        <AdSidebarSlug />

        {/* Terpopuler list */}
        <div className="rounded-xl p-4"
          style={{ background: '#F3F7FB', border: '1px solid #B5D4F4', borderLeft: '3px solid #378ADD' }}>
          <p className="text-[10px] font-extrabold tracking-[2px] uppercase mb-3 flex items-center gap-1.5"
            style={{ color: '#185FA5' }}>
            <TrendingUp size={13} strokeWidth={2.4} />
            Terpopuler
          </p>
          {terpopuler.slice(0, 5).map((a, i) => (
            <Link key={a.id} href={`/bakabar/${a.slug}`}
              className="flex items-start gap-2.5 py-2.5 last:border-0 group"
              style={{ borderBottom: '1px solid #D6E4F2' }}>
              <span className="font-bold leading-none shrink-0"
                style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 22, color: '#378ADD', width: 22 }}>
                {i + 1}
              </span>
              <p className="text-[13px] font-medium leading-[1.35] group-hover:underline"
                style={{ fontFamily: "var(--font-lora), Georgia, serif", color: '#042C53' }}>
                {a.title}
              </p>
            </Link>
          ))}
        </div>

        {/* BALAPOR CTA */}
        <div className="rounded-xl p-4 text-center text-white" style={{ background: '#003526' }}>
          <p className="font-bold text-[15px] mb-1" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Ada berita di sekitarmu?
          </p>
          <p className="text-[11px] mb-2.5" style={{ color: '#95d3ba' }}>
            Laporkan via BALAPOR
          </p>
          <Link href="/balapor/buat-laporan"
            className="inline-block bg-white px-3.5 py-1.5 rounded-md text-[11px] font-extrabold" style={{ color: '#003526' }}>
            Lapor Sekarang →
          </Link>
        </div>
      </div>
    </div>
  );
}
