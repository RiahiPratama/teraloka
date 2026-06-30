'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — Command Center Layout (Nested)
// PATH: src/app/admin/balaundry/layout.tsx
// 🛡️ Role gate eksplisit (UX/defense-in-depth, BUKAN security — BE tetap
//    requireRole('super_admin','admin_listing') + 403 AUTH_FORBIDDEN).
//    Cegah shell rusak + spam 403. 3 state tanpa flash.
// Sub-tab SECONDARY, nested di chrome admin global (admin/layout.tsx).
//    Tahap A: cuma Overview live; Laundry & Langganan DISABLED (page belum ada).
// Material Symbols (no lucide/emoji), util *-balaundry (royal blue token).
// ════════════════════════════════════════════════════════════════
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

// String role PERSIS sama backend requireRole('super_admin','admin_listing').
const ADMIN_ROLES = new Set(['super_admin', 'admin_listing']);

interface TabDef {
  key: string;
  label: string;
  icon: string; // Material Symbols name
  href: string; // route folder-based — SUDAH BENAR dari sekarang
  match: 'exact' | 'prefix';
  /** false = folder/page.tsx belum ada → tab disabled (anti-404). Flip ke true pas tahap. */
  enabled: boolean;
}

// Pola repo: tiap sub-route = FOLDER + page.tsx (mis. admin/bakos/langganan/page.tsx).
// href di sini final; Tahap B/D tinggal bikin folder + page.tsx lalu flip enabled:true.
const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: 'dashboard', href: '/admin/balaundry', match: 'exact', enabled: true },
  { key: 'laundry', label: 'Laundry', icon: 'local_laundry_service', href: '/admin/balaundry/laundry', match: 'prefix', enabled: false }, // Tahap B
  { key: 'langganan', label: 'Langganan', icon: 'workspace_premium', href: '/admin/balaundry/langganan', match: 'prefix', enabled: false }, // Tahap D
];

function isActive(tab: TabDef, pathname: string): boolean {
  if (!tab.enabled) return false;
  return tab.match === 'exact' ? pathname === tab.href : pathname.startsWith(tab.href);
}

export default function BalaundryAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { user, isLoading } = useAuth();

  // ── State a: auth masih loading → skeleton (JANGAN flash "akses ditolak") ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-64 animate-pulse rounded bg-surface-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  // ── State c: resolved + non-admin → blok ──
  if (!user || !ADMIN_ROLES.has(user.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-text-subtle">
            lock
          </span>
          <h1 className="mt-3 text-lg font-bold text-text">Akses admin diperlukan</h1>
          <p className="mt-1 text-sm text-text-muted">
            Halaman ini khusus admin BALAUNDRY (super admin / admin listing).
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-balaundry px-4 py-2 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke Admin
          </Link>
        </div>
      </div>
    );
  }

  // ── State b: resolved + authorized → sub-tab nav + children ──
  return (
    <div>
      <nav className="mb-5 border-b border-border" aria-label="BALAUNDRY Command Center">
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0">
          {TABS.map((tab) => {
            const active = isActive(tab, pathname);
            const disabled = !tab.enabled;
            const inner = (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active && 'border-balaundry text-balaundry',
                  !active && !disabled && 'border-transparent text-text-muted hover:border-border hover:text-text',
                  disabled && 'cursor-not-allowed border-transparent text-text-subtle',
                )}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  {tab.icon}
                </span>
                {tab.label}
                {disabled && (
                  <span className="ml-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-subtle">
                    soon
                  </span>
                )}
              </span>
            );
            return tab.enabled ? (
              <Link key={tab.key} href={tab.href} className="no-underline">
                {inner}
              </Link>
            ) : (
              <button
                key={tab.key}
                type="button"
                disabled
                aria-disabled="true"
                title={`${tab.label} tersedia di tahap berikutnya`}
                className="bg-transparent"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
