'use client';

/**
 * TeraLoka — UserStats
 * Phase 2 · Batch 7a1 — Users Page Migration
 * ------------------------------------------------------------
 * Stats row untuk users page — 4 metric cards.
 *
 * Metrics:
 * - Total Users      → all registered users
 * - Aktif            → is_active=true
 * - Nonaktif         → is_active=false
 * - Belum Login      → last_login=null
 *
 * Design:
 * - Icon bubble + value + label + sub-description
 * - Pakai color tokens dari design system (bukan hex inline)
 * - Responsive: 2-col mobile, 4-col desktop
 * - Loading skeleton support
 */

import type { ReactNode } from 'react';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserStats as UserStatsData } from '@/types/users';

export interface UserStatsProps {
  stats: UserStatsData;
  loading?: boolean;
  className?: string;
}

interface StatDef {
  id: string;
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  /** Tailwind classes untuk icon bubble + value */
  iconBg: string;
  valueColor: string;
}

export function UserStats({ stats, loading = false, className }: UserStatsProps) {
  const items: StatDef[] = [
    {
      id: 'total',
      icon: <Users size={18} />,
      label: 'Total Users',
      value: stats.total,
      sub: `${stats.active.toLocaleString('id-ID')} aktif`,
      iconBg: 'bg-brand-teal/10 text-brand-teal',
      valueColor: 'text-brand-teal',
    },
    {
      id: 'active',
      icon: <UserCheck size={18} />,
      label: 'Aktif',
      value: stats.active,
      sub: 'Bisa login',
      iconBg: 'bg-status-healthy/10 text-status-healthy',
      valueColor: 'text-status-healthy',
    },
    {
      id: 'inactive',
      icon: <UserX size={18} />,
      label: 'Nonaktif',
      value: stats.inactive,
      sub: 'Akses diblokir',
      iconBg: 'bg-status-critical/10 text-status-critical',
      valueColor: 'text-status-critical',
    },
    {
      id: 'never',
      icon: <Clock size={18} />,
      label: 'Belum Login',
      value: stats.neverLogin,
      sub: 'Belum pernah masuk',
      iconBg: 'bg-status-warning/10 text-status-warning',
      valueColor: 'text-status-warning',
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-3',
        className
      )}
    >
      {items.map((s) => (
        <div
          key={s.id}
          className={cn(
            'flex items-center gap-3 p-4',
            'bg-surface border border-border rounded-xl',
            'transition-colors'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
              s.iconBg
            )}
          >
            {s.icon}
          </div>
          <div className="min-w-0">
            {loading ? (
              <>
                <div className="h-7 w-12 rounded bg-surface-muted animate-pulse mb-1.5" />
                <div className="h-2.5 w-20 rounded bg-surface-muted animate-pulse" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'text-2xl font-extrabold tabular-nums leading-none tracking-tight',
                    s.valueColor
                  )}
                >
                  {s.value.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-text-muted mt-1 leading-tight">
                  {s.sub}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
