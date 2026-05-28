// ════════════════════════════════════════════════════════════════
// BAKABAR — Skyscraper Banner v2 (Phase 1 Fix)
// ────────────────────────────────────────────────────────────────
// PATCH dari v1 (14 Mei 2026 malam):
//   - Visibility breakpoint: 2xl (1536px) → min-[1700px]
//   - Reason: content area now max 1280px. Skyscraper di viewport
//     edge 16px akan tabrakan dengan content kalau viewport <1700px.
//     Math: 1280 + 2*(176px skyscraper occupies from edge) = 1632.
//     Viewport ≥1700 = aman (34px gap minimum antara content edge
//     dan skyscraper).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { InlineBannerAdData } from './region-data';

type Props = {
  ad: InlineBannerAdData;
  side: 'left' | 'right';
  visual_symbol?: string;
};

const SKY_GRADIENTS: Record<string, string> = {
  'sky-bank':     'linear-gradient(180deg, #1e3a8a 0%, #312e81 100%)',
  'sky-property': 'linear-gradient(180deg, #c2410c 0%, #7c2d12 100%)',
  'sky-bumn':     'linear-gradient(180deg, #075985 0%, #0c4a6e 100%)',
  'sky-univ':     'linear-gradient(180deg, #4c1d95 0%, #2e1065 100%)',
};

export default function SkyscraperBanner({ ad, side, visual_symbol = 'M' }: Props) {
  const sidePos = side === 'left' ? { left: 16 } : { right: 16 };
  const bg = SKY_GRADIENTS[ad.brand_class] || SKY_GRADIENTS['sky-bank'];

  const inner = (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer flex flex-col text-white"
      style={{ background: bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(245,158,11,0.2) 0%, transparent 50%)',
        }}
      />

      <span
        className="absolute top-2 right-2 z-10 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold tracking-widest uppercase"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        IKLAN
      </span>

      <div className="relative z-[2] px-4 py-5 flex flex-col h-full text-center">
        <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase opacity-75 mb-3.5">
          {ad.overline}
        </p>
        <h3
          className="text-[17px] font-bold leading-[1.2] tracking-[-0.3px] mb-3"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          {ad.title}
        </h3>

        <div
          className="flex-1 flex items-center justify-center font-black opacity-20 select-none pointer-events-none"
          style={{
            fontSize: 56,
            letterSpacing: '-2px',
            fontFamily: "var(--font-lora), Georgia, serif",
          }}
        >
          {visual_symbol}
        </div>

        <p className="text-[11px] leading-[1.45] opacity-85 mb-3.5">{ad.body}</p>

        <span
          className="bg-white text-gray-900 px-3.5 py-2.5 rounded-md text-[10px] font-extrabold uppercase tracking-[0.5px] text-center"
          style={{ color: '#111827' }}
        >
          {ad.cta_label}
        </span>
      </div>
    </div>
  );

  return (
    <aside
      // FIX: ganti 2xl:block jadi min-[1700px]:block — supaya skyscraper
      // gak tabrak content area 1280px di viewport <1700px
      className="hidden min-[1700px]:block fixed top-1/2 -translate-y-1/2 w-[160px] h-[600px] z-[40]"
      style={sidePos}
      aria-label={`Iklan skyscraper ${side === 'left' ? 'kiri' : 'kanan'}`}
    >
      {ad.cta_href ? <Link href={ad.cta_href} className="block w-full h-full">{inner}</Link> : inner}
    </aside>
  );
}
