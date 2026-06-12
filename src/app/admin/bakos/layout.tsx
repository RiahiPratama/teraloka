'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Sub-Navigation (Nested Layout)
// PATH: src/app/admin/bakos/layout.tsx
// 🛡️ Auth + role di admin/layout.tsx global. Tab bar horizontal saja.
// REAL: Overview, Listing (B4), Langganan (B5), Owner (L9), Analytics (B6).
// L9+: badge angka "perlu aksi" (klaim menunggu di Overview, perlu ditagih di Owner).
//      Muncul HANYA jika > 0. Fetch ringan 1x + refresh 60s. Nol DB baru.
// ════════════════════════════════════════════════════════════════
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Building2, CreditCard, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface TabDef { key: string; label: string; icon: ReactNode; href?: string; match?: 'exact' | 'prefix'; }

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} />, href: '/admin/bakos', match: 'exact' },
  { key: 'listing', label: 'Listing', icon: <Building2 size={15} />, href: '/admin/bakos/listing', match: 'prefix' },
  { key: 'langganan', label: 'Langganan', icon: <CreditCard size={15} />, href: '/admin/bakos/langganan', match: 'prefix' },
  { key: 'owner', label: 'Owner', icon: <Users size={15} />, href: '/admin/bakos/owner', match: 'prefix' },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} />, href: '/admin/bakos/analytics', match: 'prefix' },
];

function isActive(tab: TabDef, pathname: string): boolean {
  if (!tab.href) return false;
  return tab.match === 'exact' ? pathname === tab.href : pathname.startsWith(tab.href);
}

export default function BakosAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { token } = useAuth();
  // badge "perlu aksi" per tab key
  const [badges, setBadges] = useState<Record<string, number>>({});

  const fetchBadges = useCallback(async () => {
    const tk = token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') : '');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };
    try {
      const [dash, owners] = await Promise.all([
        fetch(`${API_URL}/bakos/admin/dashboard`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/bakos/admin/owners`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      const next: Record<string, number> = {};
      if (dash?.success) next.overview = dash.data?.claims?.pending ?? 0;   // klaim menunggu
      if (owners?.success) next.owner = owners.data?.perlu_ditagih ?? 0;     // owner perlu ditagih
      setBadges(next);
    } catch { /* silent — badge gak muncul */ }
  }, [token]);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);
  useEffect(() => { const i = setInterval(fetchBadges, 60_000); return () => clearInterval(i); }, [fetchBadges]);

  return (
    <div>
      <nav className="border-b border-border px-4 sm:px-6" aria-label="BAKOS Command Center">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0">
          {TABS.map((tab) => {
            const active = isActive(tab, pathname);
            const parkir = !tab.href;
            const badge = badges[tab.key] ?? 0;
            const inner = (
              <span className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                active && 'border-bakos text-bakos',
                !active && !parkir && 'border-transparent text-text-muted hover:text-text hover:border-border',
                parkir && 'border-transparent text-text-light cursor-not-allowed',
              )}>
                {tab.icon}{tab.label}
                {badge > 0 && (
                  <span
                    className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold leading-none text-white"
                    style={{ height: 18 }}
                    aria-label={`${badge} perlu aksi`}
                    title={tab.key === 'owner' ? `${badge} owner perlu ditagih` : `${badge} klaim menunggu`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
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
