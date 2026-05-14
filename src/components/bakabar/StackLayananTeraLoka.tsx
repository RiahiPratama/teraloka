// ════════════════════════════════════════════════════════════════
// BAKABAR — Stack Layanan TeraLoka (Phase 1)
// ────────────────────────────────────────────────────────────────
// Cross-promo card untuk service lain TeraLoka (BAKOS/BAPASIAR/
// BADONASI/BALAPOR). Mockup spec: .stack-layanan dengan brand
// gradient bg + icon emoji opacity 0.12 bottom-right + CTA button
// white bg-text-primary.
//
// Brand colors (canonical):
//   - BAKOS:    #8B5CF6 → #5B21B6 (purple)
//   - BAPASIAR: #0EA5E9 → #075985 (cyan)
//   - BADONASI: #EC4899 → #9D174D (pink)
//   - BALAPOR:  #A21CAF → #701A75 (fuchsia)
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { ServiceVariant } from './region-data';

const VARIANT_META: Record<ServiceVariant, {
  label: string;
  href: string;
  cta: string;
  icon: string;
  gradient: string;
}> = {
  bakos: {
    label:    'BAKOS',
    href:     '/kos',
    cta:      'Gabung →',
    icon:     '💬',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #5b21b6 100%)',
  },
  bapasiar: {
    label:    'BAPASIAR',
    href:     '/speed',
    cta:      'Cek →',
    icon:     '🛒',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #075985 100%)',
  },
  badonasi: {
    label:    'BADONASI',
    href:     '/fundraising',
    cta:      'Galang →',
    icon:     '🤲',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
  },
  balapor: {
    label:    'BALAPOR',
    href:     '/balapor',
    cta:      'Lapor →',
    icon:     '📢',
    gradient: 'linear-gradient(135deg, #A21CAF 0%, #701a75 100%)',
  },
};

type Props = {
  variant: ServiceVariant;
  body: string;     // per-region custom body (e.g. "Komunitas warga Ternate...")
};

export default function StackLayananTeraLoka({ variant, body }: Props) {
  const meta = VARIANT_META[variant];

  return (
    <Link
      href={meta.href}
      className="relative rounded-lg overflow-hidden p-5 text-white cursor-pointer flex flex-col justify-between transition-transform duration-200 hover:scale-[1.01]"
      style={{
        background: meta.gradient,
        flex: 3,
        minHeight: 0,
      }}
    >
      {/* Radial overlay decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245,158,11,0.15) 0%, transparent 50%)',
        }}
      />

      {/* Big icon decoration bottom-right */}
      <div
        className="absolute pointer-events-none z-[1]"
        style={{
          bottom: -14,
          right: -14,
          fontSize: 100,
          opacity: 0.12,
        }}
      >
        {meta.icon}
      </div>

      <div className="relative z-[2]">
        <p
          className="text-[10px] font-extrabold tracking-[1.5px] uppercase opacity-85 mb-2"
        >
          Layanan TeraLoka
        </p>
        <h3
          className="text-[24px] font-extrabold leading-[1.05] tracking-[-0.7px] mb-2"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {meta.label}
        </h3>
        <p className="text-[12px] leading-[1.5] opacity-90">{body}</p>
      </div>

      <span
        className="relative z-[2] inline-block self-start bg-white text-gray-900 px-3.5 py-2 rounded-md text-[11px] font-extrabold uppercase tracking-[0.5px] mt-3"
      >
        {meta.cta}
      </span>
    </Link>
  );
}
