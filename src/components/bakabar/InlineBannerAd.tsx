// ════════════════════════════════════════════════════════════════
// BAKABAR — Inline Banner Ad (Phase 1)
// ────────────────────────────────────────────────────────────────
// Full-width banner, 8:1 aspect, displayed antar regions.
// Mockup spec: .inline-banner-ad — gradient bg, badge "Iklan" atau
// "Layanan" (TeraLoka internal), Lora 24px title.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { InlineBannerAdData } from './region-data';

const BG_GRADIENTS: Record<string, string> = {
  'b-tlkm':       'linear-gradient(135deg, #be123c 0%, #881337 50%, #4c1d95 100%)',
  'b-bumn':       'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)',
  'b-teraloka':   'linear-gradient(135deg, #003526 0%, #004d3a 50%, #8B5CF6 100%)',
  'b-mandiri':    'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
  'b-property2':  'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
};

type Props = { ad: InlineBannerAdData };

export default function InlineBannerAd({ ad }: Props) {
  const bg = BG_GRADIENTS[ad.brand_class] || BG_GRADIENTS['b-tlkm'];

  const isLayanan = ad.badge_style === 'teraloka';
  const badgeBg   = isLayanan ? '#95d3ba' : '#F59E0B';
  const badgeColor = isLayanan ? '#003526' : '#fff';

  const inner = (
    <div
      className="relative my-10 w-full rounded-xl overflow-hidden flex items-center justify-between px-12 text-white cursor-pointer"
      style={{ background: bg, aspectRatio: '8 / 1' }}
    >
      {/* Radial decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }}
      />

      {/* Badge top-right */}
      <span
        className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
        style={{ background: badgeBg, color: badgeColor }}
      >
        {ad.badge_label}
      </span>

      {/* Content */}
      <div className="relative z-[2] flex-1 max-w-[60%]">
        <p
          className="text-[10px] font-extrabold tracking-[1.5px] uppercase opacity-75 mb-2"
        >
          {ad.overline}
        </p>
        <h3
          className="text-[24px] font-bold leading-[1.15] tracking-[-0.4px] mb-1.5"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          {ad.title}
        </h3>
        <p className="text-[13px] opacity-85">{ad.body}</p>
      </div>

      {/* CTA button */}
      <button
        className="relative z-[2] bg-white px-5 py-2.5 rounded-lg text-[12px] font-bold inline-flex items-center gap-1.5"
        style={{ color: '#111827' }}
      >
        {ad.cta_label}
        <ArrowRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  );

  if (ad.cta_href) {
    return <Link href={ad.cta_href}>{inner}</Link>;
  }
  return inner;
}
