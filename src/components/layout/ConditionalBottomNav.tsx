'use client';

// ════════════════════════════════════════════════════════════════
// CONDITIONAL BOTTOM NAV (v2)
// ────────────────────────────────────────────────────────────────
// Smart router untuk bottom nav berdasarkan route:
//
//   /admin/*    → No bottom nav (admin punya sidebar sendiri)
//   /login      → No bottom nav
//   /owner/*    → OwnerBottomNav (4 tab: Dashboard/Pencairan/Laporan/Profile)
//   Other       → BottomNav publik (5 tab: Home/BAKABAR/Cari/BAPASIAR/Akun)
//
// Wrapper agar BottomNav muncul dengan konteks yang tepat per role.
// ════════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import OwnerBottomNav from '@/components/layout/OwnerBottomNav';

export default function ConditionalBottomNav() {
  const pathname = usePathname();

  // No bottom nav untuk admin & login
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/login')) return null;

  // Owner section pakai bottom nav khusus
  if (pathname.startsWith('/owner')) return <OwnerBottomNav />;

  // Default: bottom nav publik
  return <BottomNav />;
}
