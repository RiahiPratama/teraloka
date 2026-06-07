'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Sub-Navigation (Nested Layout)
// PATH: src/app/admin/bakos/layout.tsx
// 🛡️ Auth + role udah di admin/layout.tsx global. Tab bar horizontal saja.
//    Pola BALAJU: REAL = link aktif, PARKIR = disabled + "soon".
// REAL: Overview (/admin/bakos), Listing (/admin/bakos/listing — B4 verify+status).
// PARKIR: Langganan (B5), Analytics (B6). Verifikasi DIGABUNG ke Listing (B4).
// ════════════════════════════════════════════════════════════════
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TabDef {
  key: string; label: string; icon: ReactNode;
  href?: string; match?: 'exact' | 'prefix';
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} />, href: '/admin/bakos', match: 'exact' },
  { key: 'listing', label: 'Listing', icon: <Building2 size={15} />, href: '/admin/bakos/listing', match: 'prefix' },
  { key: 'langganan', label: 'Langganan', icon: <CreditCard size={15} /> },   // PARKIR (B5)
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },     // PARKIR (B6)
];

function isActive(tab: TabDef, pathname: string): boolean {
  if (!tab.href) return false;
  return tab.match === 'exact' ? pathname === tab.href : pathname.startsWith(tab.href);
}

export default function BakosAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  return (
    <div>
      <nav className="border-b border-border px-4 sm:px-6" aria-label="BAKOS Command Center">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0">
          {TABS.map((tab) => {
            const active = isActive(tab, pathname);
            const parkir = !tab.href;
            const inner = (
              <span className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                active && 'border-bakos text-bakos',
                !active && !parkir && 'border-transparent text-text-muted hover:text-text hover:border-border',
                parkir && 'border-transparent text-text-light cursor-not-allowed',
              )}>
                {tab.icon}{tab.label}
                {parkir && <span className="ml-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-light">soon</span>}
              </span>
            );
            return tab.href ? (
              <Link key={tab.key} href={tab.href} className="no-underline">{inner}</Link>
            ) : (
              <button key={tab.key} type="button" disabled aria-disabled="true" className="bg-transparent">{inner}</button>
            );
          })}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
