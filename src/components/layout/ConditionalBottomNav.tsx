'use client';

// ════════════════════════════════════════════════════════════════
// CONDITIONAL BOTTOM NAV (v5)
// ────────────────────────────────────────────────────────────────
// Smart router untuk bottom nav berdasarkan route:
//
//   /admin/*       → No bottom nav (admin punya sidebar sendiri)
//   /login         → No bottom nav
//   /owner/*       → OwnerBottomNav (4 tab: Dashboard/Pencairan/Laporan/Profile)
//   FOCUS MODE     → No bottom nav (commit-decision flows)
//   BAKOS DETAIL   → No bottom nav (action-bar "Hubungi WA" ambil alih bawah)
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
//
// BAKOS DETAIL (v5 — 12 Jun 2026):
//   Halaman detail kos /bakos/<slug> pakai action-bar bawah ala Mamikos/Airbnb
//   (harga + "Hubungi via WhatsApp"). Bar itu HARUS nempel bawah tanpa diadu
//   sama BottomNav app → detail kos = focus mode. TAPI landing /bakos dan
//   /bakos/cari TETAP punya nav (itu halaman jelajah, bukan commit-decision).
//   Deteksi presisi via regex (bukan includes — includes kelewat lebar).
//
// History:
//   - v2: 3 tier router (admin/login/owner/public)
//   - v3: tambah FOCUS_MODE_PATTERNS (/donate, /konfirmasi, /terima-kasih)
//   - v4 (7 Mei 2026): hapus /terima-kasih dari focus mode
//   - v5 (12 Jun 2026): BAKOS detail focus mode (action-bar Mamikos)
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

// Detail kos = /bakos/<slug> (tepat 1 segmen setelah /bakos).
// TIDAK match /bakos (landing) maupun /bakos/cari (jelajah) — itu tetap punya nav.
// Contoh match:    /bakos/kos-permata-kalumpang-113
// Contoh NO-match:  /bakos  ·  /bakos/  ·  /bakos/cari
const BAKOS_DETAIL_RE = /^\/bakos\/(?!cari(?:\/|$))[^/]+\/?$/;

export default function ConditionalBottomNav() {
  const pathname = usePathname();

  // Admin & login routes — no bottom nav
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/login')) return null;

  // Focus mode — commit-decision flows (donate, konfirmasi)
  if (FOCUS_MODE_PATTERNS.some((pattern) => pathname.includes(pattern))) {
    return null;
  }

  // BAKOS detail kos — action-bar "Hubungi WA" ambil alih bawah (focus mode)
  if (BAKOS_DETAIL_RE.test(pathname)) return null;

  // Owner section — bottom nav khusus (4 tab)
  if (pathname.startsWith('/owner')) return <OwnerBottomNav />;

  // Default: bottom nav publik (5 tab) — termasuk /terima-kasih
  return <BottomNav />;
}
