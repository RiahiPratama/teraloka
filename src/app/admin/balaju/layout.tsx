'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Sub-Navigation (Nested Layout)
// Path: wrap semua /admin/balaju/*   (auth+role udah di admin/layout.tsx global)
//
// 🛡️ Keputusan arsitektur: sidebar global kiri (256px) SUDAH ADA. IA BALAJU
//    dirender sebagai TAB BAR horizontal (bukan sidebar kedua) → hemat ruang,
//    layout global nol disentuh.
//
// 🛡️ FILOSOFI PRD §4: tab REAL = link aktif; tab PARKIR = disabled + "soon".
//    Flip parkir→real saat backend masing-masing jadi.
//
// REAL: Dashboard (/admin/balaju), Verifikasi (/admin/balaju/drivers), Driver (/admin/balaju/roster).
//   🛡️ Roster sengaja DI LUAR /drivers biar prefix-match Verifikasi gak nyangkut.
// ═══════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Bike, Users, ShieldCheck, Wallet, SlidersHorizontal,
  BarChart3, MapPin, MonitorDot, ScrollText, Package, Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TabDef {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string; // ada = REAL (link); kosong = PARKIR (disabled)
  /** match aktif: 'exact' (Dashboard) atau 'prefix' (sub-route) */
  match?: 'exact' | 'prefix';
}

// Urutan = IA mockup §3. href hanya untuk yang backend-nya SUDAH ADA.
const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/admin/balaju', match: 'exact' },
  { key: 'ride_bike', label: 'Ride Motor', icon: <Bike size={15} /> },                                  // PARKIR (list order belum)
  { key: 'driver', label: 'Driver', icon: <Users size={15} />, href: '/admin/balaju/roster', match: 'prefix' },
  { key: 'verifikasi', label: 'Verifikasi', icon: <ShieldCheck size={15} />, href: '/admin/balaju/drivers', match: 'prefix' },
  { key: 'financial', label: 'Financial', icon: <Wallet size={15} /> },                                 // PARKIR
  { key: 'tarif', label: 'Tarif', icon: <SlidersHorizontal size={15} /> },                              // PARKIR (cek fare-config)
  { key: 'ride_car', label: 'Ride Mobil', icon: <Car size={15} /> },                                    // PARKIR (F9)
  { key: 'courier', label: 'Kurir', icon: <Package size={15} /> },                                      // PARKIR
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },                              // PARKIR
  { key: 'wilayah', label: 'Wilayah', icon: <MapPin size={15} /> },                                     // PARKIR
  { key: 'command', label: 'Command Center', icon: <MonitorDot size={15} /> },                          // PARKIR (realtime)
  { key: 'audit', label: 'Audit Log', icon: <ScrollText size={15} /> },                                 // PARKIR
];

function isActive(tab: TabDef, pathname: string): boolean {
  if (!tab.href) return false;
  return tab.match === 'exact' ? pathname === tab.href : pathname.startsWith(tab.href);
}

export default function BalajuAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <div>
      {/* ── Sub-nav: tab bar horizontal (scroll di mobile) ── */}
      <nav className="border-b border-border px-4 sm:px-6" aria-label="BALAJU Command Center">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0">
          {TABS.map((tab) => {
            const active = isActive(tab, pathname);
            const parkir = !tab.href;

            const inner = (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active && 'border-bapasiar text-bapasiar',
                  !active && !parkir && 'border-transparent text-text-muted hover:text-text hover:border-border',
                  parkir && 'border-transparent text-text-light cursor-not-allowed',
                )}
              >
                {tab.icon}
                {tab.label}
                {parkir && (
                  <span className="ml-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-light">
                    soon
                  </span>
                )}
              </span>
            );

            return tab.href ? (
              <Link key={tab.key} href={tab.href} className="no-underline">
                {inner}
              </Link>
            ) : (
              <button key={tab.key} type="button" disabled aria-disabled="true" className="bg-transparent">
                {inner}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Konten tab (page masing-masing) ── */}
      <div>{children}</div>
    </div>
  );
}
