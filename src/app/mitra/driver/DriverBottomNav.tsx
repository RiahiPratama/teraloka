'use client';

// src/app/mitra/driver/DriverBottomNav.tsx
// T2 (10 Jun 2026) — bottom nav persisten area driver. Render via layout.tsx (kena semua halaman).
// Sembunyi di layar fokus (order aktif) & pendaftaran (belum jadi driver) -> baca pathname.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User } from 'lucide-react';
import '@/components/balaju/public/balaju-landing.css';

const TABS = [
  { href: '/mitra/driver', label: 'Beranda', Icon: Home, exact: true },
  { href: '/mitra/driver/penghasilan', label: 'Penghasilan', Icon: Wallet, exact: false },
  { href: '/mitra/driver/akun', label: 'Akun', Icon: User, exact: false },
];

export default function DriverBottomNav() {
  const pathname = usePathname() || '';

  // Layar fokus: order aktif (lagi nganter) & daftar (calon driver) -> tanpa nav.
  if (pathname.startsWith('/mitra/driver/order') || pathname.startsWith('/mitra/driver/daftar')) {
    return null;
  }

  return (
    <div className="bl-landing">
      {/* spacer biar konten terakhir gak ketutup nav fixed */}
      <div aria-hidden className="h-[72px]" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bl-line)] bg-[var(--bl-cream)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition"
                style={{ color: active ? 'var(--bl-forest)' : 'var(--bl-muted)' }}
              >
                <t.Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
