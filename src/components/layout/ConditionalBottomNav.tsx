'use client';

// ════════════════════════════════════════════════════════════════
// CONDITIONAL BOTTOM NAV (v4)
// ────────────────────────────────────────────────────────────────
// Smart router untuk bottom nav berdasarkan route:
//
//   /admin/*       → No bottom nav (admin punya sidebar sendiri)
//   /login         → No bottom nav
//   /owner/*       → OwnerBottomNav (4 tab: Dashboard/Pencairan/Laporan/Profile)
//   FOCUS MODE     → No bottom nav (commit-decision flows)
//   Other          → BottomNav publik (5 tab: Home/BAKABAR/Cari/BAPASIAR/Akun)
//
// Wrapper agar BottomNav muncul dengan konteks yang tepat per role.
//
// FOCUS MODE PHILOSOPHY:
//   Pages dengan checkout flow / commit-decision moment butuh "focus mode"
//   — tanpa BottomNav distraction. Pattern industry standard: Tokopedia,
//   Shopee, Stripe checkout semua hide bottom nav saat user di payment flow.
//
//   Reasons:
//   1. Sticky bottom CTA (e.g. "Konfirmasi Donasi") gak overlap BottomNav
//   2. Mental model: "user sedang commit decision, jangan distract"
//   3. UX cleaner — focus pada 1 action (submit/upload/konfirmasi)
//
//   ⚠️ /terima-kasih SENGAJA TIDAK masuk focus mode (v4 update 7 Mei 2026):
//   Success page = post-conversion, user butuh next action.
//   Pattern industry: Tokopedia post-checkout success page SHOW nav supaya
//   user bisa lanjut explore. Hide BottomNav di success = dead-end UX.
//
//   Future-ready: BAPASIAR booking checkout, BAKOS purchase, dll
//   tinggal tambah path commit-decision ke FOCUS_MODE_PATTERNS.
//
// History:
//   - v2: 3 tier router (admin/login/owner/public)
//   - v3: tambah FOCUS_MODE_PATTERNS (/donate, /konfirmasi, /terima-kasih)
//   - v4 (7 Mei 2026): hapus /terima-kasih dari focus mode — success page
//     butuh BottomNav untuk next action (back to home, browse kampanye lain)
// ════════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import OwnerBottomNav from '@/components/layout/OwnerBottomNav';

// Routes commit-decision yang butuh "focus mode" — no BottomNav distraction.
// Match by includes() — supaya cover dynamic routes (e.g. /fundraising/[slug]/donate)
const FOCUS_MODE_PATTERNS = [
  '/donate',          // Donate flow — input nominal + identitas
  '/konfirmasi',      // Konfirmasi donasi — upload bukti transfer (commit point)
  // ⚠️ /terima-kasih TIDAK termasuk — success page butuh nav untuk next action
] as const;

export default function ConditionalBottomNav() {
  const pathname = usePathname();

  // Admin & login routes — no bottom nav
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/login')) return null;

  // Focus mode — commit-decision flows (donate, konfirmasi)
  if (FOCUS_MODE_PATTERNS.some((pattern) => pathname.includes(pattern))) {
    return null;
  }

  // Owner section — bottom nav khusus (4 tab)
  if (pathname.startsWith('/owner')) return <OwnerBottomNav />;

  // Default: bottom nav publik (5 tab) — termasuk /terima-kasih
  return <BottomNav />;
}
