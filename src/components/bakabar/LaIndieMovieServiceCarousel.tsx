'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — La Indie Movie Service Carousel v1.1 (Sprint 2A Batch D2)
// PATH: src/components/bakabar/LaIndieMovieServiceCarousel.tsx
// ────────────────────────────────────────────────────────────────
// LEAN v1.1 (15 Mei 2026):
//   - Remove cream gradient container (boros space)
//   - Match Political Banner v2.1 lean header style
//   - Vertical accent bar + label + tagline inline
//
// History:
//   - v1.0: Initial with cream container
//   - v1.1: LEAN — minimal wrapper, match LA Indie reference
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

interface ServiceMeta {
  slug:     string;
  label:    string;
  tagline:  string;
  cta:      string;
  href:     string;
  gradient: string;
  emoji:    string;
}

const SERVICES: ServiceMeta[] = [
  {
    slug:     'bakabar',
    label:    'BAKABAR',
    tagline:  'Berita Maluku Utara · Civic Journalism',
    cta:      'Baca Berita',
    href:     '/bakabar',
    gradient: 'linear-gradient(135deg, #003526 0%, #001a13 100%)',
    emoji:    '📰',
  },
  {
    slug:     'balapor',
    label:    'BALAPOR',
    tagline:  'Lapor Masalah Sekitarmu · Suara Warga',
    cta:      'Lapor Sekarang',
    href:     '/lapor',
    gradient: 'linear-gradient(135deg, #A21CAF 0%, #701a75 100%)',
    emoji:    '📢',
  },
  {
    slug:     'bapasiar',
    label:    'BAPASIAR',
    tagline:  'Pasar Online Maluku Utara · Jual & Beli',
    cta:      'Belanja',
    href:     '/speed',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #075985 100%)',
    emoji:    '🛒',
  },
  {
    slug:     'bakos',
    label:    'BAKOS',
    tagline:  'Komunitas Warga · Diskusi & Info Terkini',
    cta:      'Gabung',
    href:     '/kos',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #5b21b6 100%)',
    emoji:    '💬',
  },
  {
    slug:     'badonasi',
    label:    'BADONASI',
    tagline:  'Galang Dana · Bantu Sesama Warga MalUt',
    cta:      'Berdonasi',
    href:     '/fundraising',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
    emoji:    '🤲',
  },
];

const AUTO_ROTATE_MS = 4500;
const HOVER_GRACE_MS = 1500;
const POSTER_W       = 165;
const POSTER_H       = 245;
const FOCUSED_SCALE  = 1.28;

export default function LaIndieMovieServiceCarousel() {
  const [focusedIdx, setFocusedIdx] = useState(1); // BALAPOR start
  const [isPaused, setIsPaused] = useState(false);

  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isPaused) return;
    rotationRef.current = setInterval(() => {
      setFocusedIdx(prev => (prev + 1) % SERVICES.length);
    }, AUTO_ROTATE_MS);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [isPaused]);

  const handleHover = (idx: number) => {
    if (graceRef.current) clearTimeout(graceRef.current);
    setIsPaused(true);
    setFocusedIdx(idx);
  };

  const handleLeave = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
  };

  useEffect(() => {
    return () => {
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, []);

  const focusedService = SERVICES[focusedIdx];

  return (
    <section className="my-8">
      {/* Lean header — vertical bar + label + tagline */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block"
            style={{ width: 4, height: 22, background: '#8B5CF6', borderRadius: 2 }}
          />
          <h3
            className="text-[16px] md:text-[18px] font-extrabold uppercase tracking-[-0.3px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Layanan TeraLoka
          </h3>
        </div>
        <span
          className="text-[11px] text-gray-500 italic hidden md:inline"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Semua yang kamu butuhkan di MalUt, ADA di sini
        </span>
      </div>

      {/* Focused service info */}
      <div className="text-center mb-4 min-h-[60px]">
        <p
          key={focusedService.slug}
          className="text-[18px] md:text-[22px] font-extrabold leading-tight animate-fadeIn"
          style={{ fontFamily: "'Lora', Georgia, serif", color: '#1F2937' }}
        >
          {focusedService.label}
        </p>
        <p
          key={`${focusedService.slug}-tag`}
          className="text-[12px] md:text-[13px] text-gray-600 mt-1 animate-fadeIn px-4"
        >
          {focusedService.tagline}
        </p>
      </div>

      {/* Poster gallery */}
      <div
        className="flex items-center justify-center gap-3 md:gap-5 py-8 overflow-x-auto md:overflow-visible"
        style={{ minHeight: POSTER_H * FOCUSED_SCALE + 20 }}
      >
        {SERVICES.map((service, idx) => (
          <ServicePoster
            key={service.slug}
            service={service}
            isFocused={idx === focusedIdx}
            onHover={() => handleHover(idx)}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Dots + CTA compact */}
      <div className="flex flex-col items-center gap-4 mt-1">
        <div className="flex justify-center gap-1.5">
          {SERVICES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleHover(idx)}
              onMouseLeave={handleLeave}
              className="transition-all duration-300"
              aria-label={`Pilih service ${SERVICES[idx].label}`}
              style={{
                width: idx === focusedIdx ? 22 : 6,
                height: 5,
                borderRadius: 3,
                background: idx === focusedIdx ? '#1F2937' : '#D1D5DB',
              }}
            />
          ))}
        </div>

        <Link
          key={focusedService.slug + '-cta'}
          href={focusedService.href}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-white text-[12px] font-extrabold uppercase tracking-[0.6px] transition-all duration-300 hover:scale-105 animate-fadeIn"
          style={{ background: focusedService.gradient }}
        >
          {focusedService.cta} →
        </Link>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────

interface ServicePosterProps {
  service:   ServiceMeta;
  isFocused: boolean;
  onHover:   () => void;
  onLeave:   () => void;
}

function ServicePoster({ service, isFocused, onHover, onLeave }: ServicePosterProps) {
  return (
    <Link
      href={service.href}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      aria-label={`Buka ${service.label}`}
      className="block relative rounded-sm overflow-hidden cursor-pointer"
      style={{
        width: `${POSTER_W}px`,
        height: `${POSTER_H}px`,
        transform: isFocused ? `scale(${FOCUSED_SCALE})` : 'scale(1)',
        transformOrigin: 'center',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s ease',
        zIndex: isFocused ? 10 : 1,
        boxShadow: isFocused
          ? '0 20px 40px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)'
          : '0 3px 10px rgba(0,0,0,0.12)',
        background: service.gradient,
        flexShrink: 0,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 50%)',
        }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -18,
          right: -14,
          fontSize: 130,
          opacity: 0.14,
          lineHeight: 1,
        }}
      >
        {service.emoji}
      </div>

      <div
        className="absolute top-2 left-2 text-white text-[7px] font-extrabold tracking-[0.6px] uppercase opacity-80"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
      >
        TeraLoka
      </div>

      <div className="absolute bottom-3 left-3 right-3 text-white">
        <p
          className="font-extrabold leading-tight"
          style={{
            fontSize: '17px',
            fontFamily: "'Lora', Georgia, serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {service.label}
        </p>
      </div>

      {isFocused && (
        <>
          <div className="absolute top-[-6px] left-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute top-[-6px] right-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] left-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] right-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
        </>
      )}
    </Link>
  );
}
