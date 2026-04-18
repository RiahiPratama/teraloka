'use client';

/**
 * TeraLoka — QuickActionMenu
 * Phase 2 · Batch 4a — Domain Components
 * Batch 6b Update: Added jasa to ICON_BG (21 services)
 * ------------------------------------------------------------
 * Grid tombol aksi cepat untuk admin — shortcut ke task yang sering
 * dilakukan (tulis artikel, kelola users, cek audit log, system check).
 *
 * Layout:
 * - Grid responsive (2 kolom default, bisa disesuaikan)
 * - Tiap item: icon bubble dengan service color + label
 * - Hover effect smooth
 *
 * Contoh:
 *   <QuickActionMenu
 *     title="Menu Cepat"
 *     items={[
 *       { id: 'write',   label: 'Tulis Artikel', icon: <Edit3 />,
 *         service: 'bakabar', href: '/office/newsroom/bakabar/hub/new' },
 *       { id: 'users',   label: 'Kelola Users', icon: <Users />,
 *         service: 'users', href: '/admin/users' },
 *       { id: 'audit',   label: 'Audit Log', icon: <History />,
 *         service: 'trustsafety', href: '/admin/articles/audit-log' },
 *       { id: 'health',  label: 'System Health', icon: <Activity />,
 *         service: 'syshealth', href: '/admin/system-health' },
 *     ]}
 *   />
 */

import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { type ServiceKey } from '@/components/ui/badge';

export interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  service: ServiceKey;
  href?: string;
  onClick?: () => void;
  /** Badge count kecil di pojok kanan atas (notif dot) */
  badge?: number;
  /** Deskripsi kecil di bawah label (optional) */
  sublabel?: string;
  /** Disabled state (coming soon feature) */
  disabled?: boolean;
}

export interface QuickActionMenuProps {
  items: QuickAction[];
  title?: string;
  /** Jumlah kolom grid. Default 2. */
  columns?: 2 | 3 | 4;
  /** Bungkus dalam Card (default true). Set false buat embed di layout lain. */
  wrapped?: boolean;
  className?: string;
}

const ICON_BG: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar-muted text-bakabar',
  balapor: 'bg-balapor-muted text-balapor',
  badonasi: 'bg-badonasi-muted text-badonasi',
  bakos: 'bg-bakos-muted text-bakos',
  properti: 'bg-properti-muted text-properti',
  kendaraan: 'bg-kendaraan-muted text-kendaraan',
  baantar: 'bg-baantar-muted text-baantar',
  bapasiar: 'bg-bapasiar-muted text-bapasiar',
  baronda: 'bg-baronda-muted text-baronda',
  jasa: 'bg-jasa-muted text-jasa',
  ppob: 'bg-ppob-muted text-ppob',
  event: 'bg-event-muted text-event',
  finansial: 'bg-finansial-muted text-finansial',
  ads: 'bg-ads-muted text-ads',
  ticker: 'bg-ticker-muted text-ticker',
  notifwa: 'bg-notifwa-muted text-notifwa',
  analytics: 'bg-analytics-muted text-analytics',
  syshealth: 'bg-syshealth-muted text-syshealth',
  trustsafety: 'bg-trustsafety-muted text-trustsafety',
  users: 'bg-users-muted text-users',
  roles: 'bg-roles-muted text-roles',
};

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

function ActionTile({ item }: { item: QuickAction }) {
  const tileContent = (
    <div
      className={cn(
        'relative flex flex-col items-start gap-2.5 p-4 rounded-xl',
        'bg-surface border border-border transition-all duration-150',
        !item.disabled &&
          'hover:border-border hover:shadow-sm hover:-translate-y-0.5',
        item.disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Badge count notif (corner) */}
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            'absolute top-2 right-2 flex items-center justify-center',
            'min-w-[20px] h-5 px-1.5 rounded-full',
            'bg-status-critical text-white text-[10px] font-bold',
            'tabular-nums'
          )}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}

      {/* Icon bubble dengan service color */}
      <div
        className={cn(
          'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
          ICON_BG[item.service]
        )}
      >
        {item.icon}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-text leading-tight">
          {item.label}
        </div>
        {item.sublabel && (
          <div className="text-xs text-text-muted mt-1 leading-snug">
            {item.sublabel}
          </div>
        )}
        {item.disabled && (
          <div className="text-[10px] font-medium text-text-subtle mt-1 uppercase tracking-wide">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );

  if (item.disabled) {
    return <div aria-disabled>{tileContent}</div>;
  }

  if (item.href) {
    return (
      <Link href={item.href} className="block no-underline">
        {tileContent}
      </Link>
    );
  }

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className="text-left w-full"
      >
        {tileContent}
      </button>
    );
  }

  return tileContent;
}

export function QuickActionMenu({
  items,
  title = 'Menu Cepat',
  columns = 2,
  wrapped = true,
  className,
}: QuickActionMenuProps) {
  const grid = (
    <div className={cn('grid gap-3', COLUMNS_CLASS[columns])}>
      {items.map((item) => (
        <ActionTile key={item.id} item={item} />
      ))}
    </div>
  );

  if (!wrapped) {
    return <div className={className}>{grid}</div>;
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-text-muted">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">{grid}</CardContent>
    </Card>
  );
}
