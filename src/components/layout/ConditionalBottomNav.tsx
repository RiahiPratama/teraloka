'use client';

// ════════════════════════════════════════════════════════════════
// CONDITIONAL BOTTOM NAV (v3)
// ────────────────────────────────────────────────────────────────
// Smart router untuk bottom nav berdasarkan route:
//
//   /admin/*       → No bottom nav (admin punya sidebar sendiri)
//   /login         → No bottom nav
//   /owner/*       → OwnerBottomNav (4 tab: Dashboard/Pencairan/Laporan/Profile)
//   FOCUS MODE     → No bottom nav (checkout/transaction flows)
//   Other          → BottomNav publik (5 tab: Home/BAKABAR/Cari/BAPASIAR/Akun)
//
// Wrapper agar BottomNav muncul dengan konteks yang tepat per role.
//
// FOCUS MODE PHILOSOPHY (added 7 Mei 2026):
//   Pages dengan checkout flow / transaction commit point butuh "focus mode"
//   — tanpa BottomNav distraction. Pattern industry standard: Tokopedia,
//   Shopee, Stripe checkout semua hide bottom nav saat user di payment flow.
//
//   Reasons:
//   1. Sticky bottom CTA (e.g. "Konfirmasi Donasi") gak overlap BottomNav
//   2. Mental model: "user sedang commit decision, jangan distract"
//   3. UX cleaner — focus pada 1 action (submit/upload/konfirmasi)
//
//   Future-ready: BAPASIAR booking checkout, BAKOS purchase, dll
//   tinggal tambah path ke FOCUS_MODE_PATTERNS.
// ════════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import OwnerBottomNav from '@/components/layout/OwnerBottomNav';

// Routes yang harus dalam "focus mode" — no BottomNav distraction.
// Match by includes() — supaya cover dynamic routes (e.g. /fundraising/[slug]/donate)
const FOCUS_MODE_PATTERNS = [
  '/donate',          // Donate flow — input nominal + identitas
  '/konfirmasi',      // Konfirmasi donasi — upload bukti transfer
  '/terima-kasih',    // Success page donasi — clean experience, no clutter
] as const;

export default function ConditionalBottomNav() {
  const pathname = usePathname();

  // Admin & login routes — no bottom nav
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/login')) return null;

  // Focus mode — checkout / transaction flows
  if (FOCUS_MODE_PATTERNS.some((pattern) => pathname.includes(pattern))) {
    return null;
  }

  // Owner section — bottom nav khusus (4 tab)
  if (pathname.startsWith('/owner')) return <OwnerBottomNav />;

  // Default: bottom nav publik (5 tab)
  return <BottomNav />;
}
