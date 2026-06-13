'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Sub-Navigation (Nested Layout)
// Path: wrap semua /admin/balaju/*   (auth+role udah di admin/layout.tsx global)
//
// 🛡️ Sidebar global kiri (256px) SUDAH ADA. IA BALAJU = TAB BAR horizontal
//    (bukan sidebar kedua). Layout global nol disentuh.
// 🛡️ FILOSOFI PRD §4: tab REAL = link aktif; tab PARKIR = disabled + "soon".
//
// REAL: Dashboard (/admin/balaju), Ride Motor (/admin/balaju/rides),
//       Driver (/admin/balaju/roster), Verifikasi (/admin/balaju/drivers),
//       Tarif (/admin/balaju/tarif), Financial (/admin/balaju/financial),
//       Order Health (/admin/balaju/order-health).  ← reliabilitas notif dispatch
//   🛡️ Tiap route REAL beda prefix → match-prefix gak saling nyangkut.
// ═══════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Bike, Users, ShieldCheck, Wallet, SlidersHorizontal,
  BarChart3, MapPin, MonitorDot, ScrollText, Package, Car, Activity, Siren,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TabDef {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string; // ada = REAL (link); kosong = PARKIR (disabled)
  match?: 'exact' | 'prefix';
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/admin/balaju', match: 'exact' },
  { key: 'ride_bike', label: 'Ride Motor', icon: <Bike size={15} />, href: '/admin/balaju/rides', match: 'prefix' },
  { key: 'driver', label: 'Driver', icon: <Users size={15} />, href: '/admin/balaju/roster', match: 'prefix' },
  { key: 'verifikasi', label: 'Verifikasi', icon: <ShieldCheck size={15} />, href: '/admin/balaju/drivers', match: 'prefix' },
  { key: 'tarif', label: 'Tarif', icon: <SlidersHorizontal size={15} />, href: '/admin/balaju/tarif', match: 'prefix' },
  { key: 'financial', label: 'Financial', icon: <Wallet size={15} />, href: '/admin/balaju/financial', match: 'prefix' }, // REAL (audit komisi akrual)
  { key: 'order_health', label: 'Order Health', icon: <Activity size={15} />, href: '/admin/balaju/order-health', match: 'prefix' }, // REAL (reliabilitas notif dispatch + gone-dark)
  { key: 'sos', label: 'SOS', icon: <Siren size={15} />, href: '/admin/balaju/sos', match: 'prefix' }, // REAL (monitor sinyal darurat rider, 13 Jun 2026)
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
                  active && 'border-balaju text-balaju',
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
