'use client';

// ════════════════════════════════════════════════════════════════
// OWNER BOTTOM NAV — UNIVERSAL (12 Jun 2026)
// ────────────────────────────────────────────────────────────────
// 4 tab GLOBAL (bukan donasi-specific): Beranda · Portal Mitra · Aktivitas · Profil
//
// Kenapa universal: owner = satu warga banyak peran (kos/donasi/driver/citizen).
// Bottom nav owner = navigasi GLOBAL (keluar/pindah layanan), BUKAN sub-fitur
// satu layanan. Sub-fitur (Pencairan/Laporan donasi, Penyewa/Tagihan kos) =
// navigasi DALAM konten tiap section (header lokal + breadcrumb).
//
//   Beranda      → /            (homepage TeraLoka — keluar dari mode owner)
//   Portal Mitra → /owner       (hub layanan owner: kos, dst — pindah layanan)
//   Aktivitas    → /aktivitas   (jejak lintas-layanan, citizen area)
//   Profil       → /owner/profile
//
// History:
//   - (lama) 4 tab Dashboard/Pencairan/Laporan/Profile — donasi-specific,
//     nyasar di /owner/bakos. DIGANTI jadi universal 12 Jun 2026.
//
// Behavior tetap: auto-hide saat keyboard / modal open (via ModalProvider).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Clock, User } from 'lucide-react';
import { useKeyboardOpen } from '@/utils/pwa-utils';
import { useModal } from '@/components/providers/ModalProvider';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: any;
}

export default function OwnerBottomNav() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const { isAnyModalOpen } = useModal();

  const items: NavItem[] = [
    { key: 'beranda', label: 'Beranda', href: '/', icon: Home },
    { key: 'mitra', label: 'Portal Mitra', href: '/owner', icon: Store },
    { key: 'aktivitas', label: 'Aktivitas', href: '/aktivitas', icon: Clock },
    { key: 'profil', label: 'Profil', href: '/owner/profile', icon: User },
  ];

  function isActive(item: NavItem) {
    if (item.key === 'beranda') return pathname === '/';
    if (item.key === 'mitra') {
      // Portal Mitra active di /owner + semua sub-section owner KECUALI profil
      return pathname.startsWith('/owner') && pathname !== '/owner/profile';
    }
    if (item.key === 'aktivitas') return pathname.startsWith('/aktivitas');
    if (item.key === 'profil') return pathname === '/owner/profile';
    return false;
  }

  // Hide saat keyboard muncul (reclaim space)
  if (keyboardOpen) return null;

  // Hide saat modal open (slide down — preserve mount untuk transisi halus)
  const hidden = isAnyModalOpen;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-200 ease-out"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-light, #E5E7EB)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: hidden ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      aria-hidden={hidden}
    >
      <div className="flex items-center justify-around px-2" style={{ height: 60 }}>
        {items.map(item => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-opacity active:opacity-70"
              tabIndex={hidden ? -1 : 0}
            >
              <Icon
                size={22}
                style={{ color: active ? 'var(--primary, #003526)' : '#9CA3AF' }}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary, #003526)' : '#9CA3AF',
                  letterSpacing: '0.01em',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
