'use client';

/**
 * TeraLoka — Service Icons Registry
 * Phase 2 · Batch 4c — Domain Components
 * ------------------------------------------------------------
 * Centralized icon system untuk 20 services TeraLoka.
 *
 * 5 CUSTOM SVG icons (priority services, PRD section 3.4):
 * - BakabarIcon   → Speech bubble + news lines (berita)
 * - BalaporIcon   → Radar ping concentric circles (laporan real-time)
 * - BadonasiIcon  → Two cupped hands + drop (donasi)
 * - BakosIcon     → Window + bed silhouette (kos)
 * - UsersIcon     → Three overlapping circles (grup)
 *
 * 15 LUCIDE fallback icons untuk 15 service lain — siap di-replace
 * dengan custom SVG di batch lanjutan (Batch 4d / 5).
 *
 * Semua icon pakai `currentColor` → warna otomatis ikut parent
 * (via Tailwind `text-bakabar` dll).
 *
 * Usage:
 *   // Via registry
 *   import { ServiceIcons } from '@/components/icons/service-icons';
 *   const Icon = ServiceIcons.bakabar;
 *   <Icon size={18} />
 *
 *   // Direct import individual icon
 *   import { BakabarIcon } from '@/components/icons/service-icons';
 *   <BakabarIcon size={18} />
 *
 *   // Color via parent className
 *   <div className="text-bakabar">
 *     <BakabarIcon size={18} />
 *   </div>
 *
 * Catatan: existing `src/components/ui/ServiceIcon.tsx` TIDAK kena dampak —
 * itu generic renderer low-level, tetap berfungsi untuk legacy callers.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  Activity,
  AlignJustify,
  BarChart3,
  Building2,
  CalendarClock,
  Car,
  Compass,
  KeyRound,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  Ship,
  Shield,
  Wallet,
  type LucideProps,
} from 'lucide-react';
import type { ServiceKey } from '@/components/ui/badge';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'size'> {
  size?: number;
}

/* ─── Base SVG wrapper — konsisten stroke style ─── */

function SvgBase({
  size = 18,
  children,
  className,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ─── 1. BakabarIcon — Speech bubble dengan baris konten ─── */

export function BakabarIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M20 4H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2l-1 4 5-4h9a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3z" />
      <path d="M7 10h9" />
      <path d="M7 13h6" />
    </SvgBase>
  );
}

/* ─── 2. BalaporIcon — Radar ping (dot + 2 konsentrik) ─── */

export function BalaporIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      {/* Center dot filled */}
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="6" strokeOpacity="0.7" />
      {/* Outer ring (faded) */}
      <circle cx="12" cy="12" r="10" strokeOpacity="0.35" />
    </SvgBase>
  );
}

/* ─── 3. BadonasiIcon — Two cupped hands + drop di atas ─── */

export function BadonasiIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      {/* Drop/heart atas */}
      <circle cx="12" cy="6" r="2" fill="currentColor" stroke="none" />
      <path d="M12 8.2v2.3" strokeWidth="2" />
      {/* Two hands forming bowl */}
      <path d="M3.5 13.5c0-1.5 1.5-2.5 3-2.5" />
      <path d="M20.5 13.5c0-1.5-1.5-2.5-3-2.5" />
      <path d="M3.5 13.5c0 3.5 3.5 6.5 8.5 6.5s8.5-3 8.5-6.5" />
    </SvgBase>
  );
}

/* ─── 4. BakosIcon — Window + bed silhouette ─── */

export function BakosIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      {/* Window/frame atas */}
      <rect x="5" y="3" width="14" height="8" rx="1.5" />
      <path d="M5 7h14" />
      <path d="M12 3v8" />
      {/* Bed frame bawah */}
      <path d="M3 15v6" strokeLinecap="round" />
      <path d="M21 15v6" strokeLinecap="round" />
      <path d="M3 18h18" />
      {/* Pillow */}
      <rect x="6.5" y="14" width="11" height="3" rx="1" />
    </SvgBase>
  );
}

/* ─── 5. UsersIcon — Three overlapping circles (honeycomb/komunitas) ─── */

export function UsersIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="8.5" cy="9" r="3.5" />
      <circle cx="15.5" cy="9" r="3.5" />
      <circle cx="12" cy="15.5" r="3.5" />
    </SvgBase>
  );
}

/* ─── Lucide fallback wrapper ───
   Normalize Lucide props ke IconProps kita (standardize size).
*/
function wrap(Icon: ComponentType<LucideProps>): ComponentType<IconProps> {
  return function WrappedIcon({ size = 18, ...props }: IconProps) {
    return <Icon size={size} {...(props as LucideProps)} />;
  };
}

/* ─── Registry ───
   Consumer call via ServiceIcons[key] → component.
   5 custom + 15 Lucide fallback = 20 service keys covered.
*/

export const ServiceIcons: Record<ServiceKey, ComponentType<IconProps>> = {
  // Custom (priority)
  bakabar: BakabarIcon,
  balapor: BalaporIcon,
  badonasi: BadonasiIcon,
  bakos: BakosIcon,
  users: UsersIcon,

  // Lucide fallbacks — akan di-upgrade ke custom SVG di Batch 4d/5
  properti: wrap(Building2),
  kendaraan: wrap(Car),
  baantar: wrap(Package),
  bapasiar: wrap(Ship),
  baronda: wrap(Compass),
  ppob: wrap(Receipt),
  event: wrap(CalendarClock),
  finansial: wrap(Wallet),
  ads: wrap(Megaphone),
  ticker: wrap(AlignJustify),
  notifwa: wrap(MessageSquare),
  analytics: wrap(BarChart3),
  syshealth: wrap(Activity),
  trustsafety: wrap(Shield),
  roles: wrap(KeyRound),
};

/* ─── Helper: determine which are custom vs lucide (for docs/debug) ─── */

export const CUSTOM_SERVICE_ICONS: ServiceKey[] = [
  'bakabar',
  'balapor',
  'badonasi',
  'bakos',
  'users',
];
