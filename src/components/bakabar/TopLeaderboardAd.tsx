// ════════════════════════════════════════════════════════════════
// BAKABAR — Top Leaderboard Ad (Phase 1)
// ────────────────────────────────────────────────────────────────
// Hero banner above-the-fold, full canvas width.
// Mockup spec: 1680×220 gradient, badge "IKLAN" top-right.
//
// 14 Mei 2026 (Sprint 2A Batch 5 Phase 1):
//   Mockup HTML class .ad-leaderboard-big — gradient blue
//   #0F4C81 → #1E6FA5 → #312E81 + radial overlays
//   Content: overline + h2 (Lora) + body + CTA button
//   + visual placeholder (font 56px Lora "M" misalnya)
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { InlineBannerAdData } from './region-data';

type Props = {
  ad: InlineBannerAdData;
  visual_symbol?: string;       // 1 char untuk visual placeholder kanan (e.g. "M")
};

export default function TopLeaderboardAd({ ad, visual_symbol = 'M' }: Props) {
  const inner = (
    <div
      className="relative w-full h-[220px] rounded-xl overflow-hidden flex items-center justify-between px-12 text-white cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #0F4C81 0%, #1E6FA5 60%, #312E81 100%)',
      }}
    >
      {/* Radial overlay decorations */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 15% 80%, rgba(245,158,11,0.18) 0%, transparent 50%)',
        }}
      />

      {/* IKLAN badge top-right */}
      <span
        className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
        style={{ background: '#F59E0B', color: '#fff' }}
      >
        IKLAN
      </span>

      {/* Content */}
      <div className="relative z-[2] max-w-[60%]">
        <p
          className="text-[11px] font-extrabold tracking-[2px] uppercase opacity-75 mb-3"
          style={{ letterSpacing: '2px' }}
        >
          {ad.overline}
        </p>
        <h2
          className="text-[32px] font-bold leading-[1.1] tracking-[-0.6px] mb-2.5"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {ad.title}
        </h2>
        <p className="text-[14px] opacity-85 mb-4 max-w-[500px]">{ad.body}</p>
        <button
          className="inline-flex items-center gap-1.5 bg-white text-gray-900 px-5 py-2.5 rounded-lg text-[13px] font-bold"
          style={{ color: '#111827' }}
        >
          {ad.cta_label}
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Visual placeholder (big letter) */}
      <div
        className="relative z-[2] w-[240px] h-[160px] rounded-xl flex items-center justify-center text-white"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 900,
          fontSize: 56,
          letterSpacing: '-2px',
        }}
      >
        {visual_symbol}
      </div>
    </div>
  );

  if (ad.cta_href) {
    return <Link href={ad.cta_href}>{inner}</Link>;
  }
  return inner;
}
