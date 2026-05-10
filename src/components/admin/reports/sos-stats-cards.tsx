'use client';

/**
 * TeraLoka — SOS Stats Cards
 * Bridge Sprint Day 12 Step 7 Batch B1 (10 Mei 2026)
 * ------------------------------------------------------------
 * 4 main stats card untuk admin SOS dashboard.
 *
 * Theming: CSS variables (auto-adaptive light + dark via .dark class).
 * Pattern reference: wilayah-tab.tsx, pelapor-tab.tsx (CSS vars convention).
 *
 * Icon convention:
 *   - Lucide React (admin pattern UI elements)
 *   - Material Symbols (service-type identifiers, consistent dengan public modal)
 *
 * Hotfix evening 10 Mei 2026:
 *   - Replace bg-white/text-gray-* hardcoded → CSS variables
 *   - Theme adaptive otomatis via var(--color-surface) etc.
 */

import { Siren, AlertCircle, Eye, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminSosStats } from '@/types/sos-admin';
import { EMERGENCY_TYPE_OPTIONS } from '@/types/sos';

interface SosStatsCardsProps {
  stats: AdminSosStats | null;
  isLoading?: boolean;
}

export function SosStatsCards({ stats, isLoading }: SosStatsCardsProps) {
  if (isLoading || !stats) {
    return <SosStatsCardsSkeleton />;
  }

  const activeNow =
    stats.pending + stats.acknowledged + stats.dispatched + stats.on_scene;

  return (
    <div className="space-y-4">
      {/* Main 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Hari Ini"
          value={stats.total_today}
          gradientFrom="from-red-500"
          gradientTo="to-red-600"
          Icon={Siren}
          subtext={`${stats.recent_24h} dalam 24 jam`}
        />
        <StatCard
          label="Menunggu"
          value={stats.pending}
          gradientFrom="from-amber-500"
          gradientTo="to-orange-600"
          Icon={AlertCircle}
          subtext={stats.pending > 0 ? 'Perlu acknowledge' : 'Semua tertangani'}
          urgent={stats.pending > 0}
        />
        <StatCard
          label="Aktif Sekarang"
          value={activeNow}
          gradientFrom="from-blue-500"
          gradientTo="to-indigo-600"
          Icon={Eye}
          subtext={`${stats.acknowledged} ack · ${stats.dispatched} dispatch · ${stats.on_scene} on scene`}
        />
        <StatCard
          label="Selesai Hari Ini"
          value={stats.resolved_today}
          gradientFrom="from-emerald-500"
          gradientTo="to-teal-600"
          Icon={CheckCircle2}
          subtext={
            stats.false_alarm_today + stats.cancelled_today > 0
              ? `+${stats.false_alarm_today} false · ${stats.cancelled_today} batal`
              : 'Tidak ada false alarm'
          }
        />
      </div>

      {/* By-type breakdown — theme-adaptive */}
      {stats.total_today > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Distribusi Hari Ini
          </h3>
          <div className="space-y-2">
            {EMERGENCY_TYPE_OPTIONS.map((meta) => {
              const count = stats.by_type_today[meta.type] ?? 0;
              if (count === 0) return null;
              const percent = (count / stats.total_today) * 100;
              return (
                <div key={meta.type} className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo} flex items-center justify-center`}
                  >
                    <span
                      className="material-symbols-outlined text-white text-sm"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                    >
                      {meta.iconName}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-bold"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="text-xs font-extrabold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--color-surface-muted)' }}
                    >
                      <div
                        className={`h-full bg-gradient-to-r ${meta.gradientFrom} ${meta.gradientTo} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Card Component ─────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  gradientFrom: string;
  gradientTo: string;
  Icon: LucideIcon;
  subtext: string;
  urgent?: boolean;
}

function StatCard({
  label,
  value,
  gradientFrom,
  gradientTo,
  Icon,
  subtext,
  urgent,
}: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
      style={{
        background: 'var(--color-surface)',
        border: urgent
          ? '2px solid var(--color-status-warning)'
          : '2px solid var(--color-border)',
        boxShadow: urgent
          ? '0 0 0 4px rgba(245, 158, 11, 0.1)'
          : undefined,
      }}
    >
      {urgent && (
        <span
          className="absolute top-2 right-2 inline-flex h-2 w-2 rounded-full animate-pulse"
          style={{ background: 'var(--color-status-warning)' }}
        />
      )}
      <div className="flex items-start gap-3">
        <div
          className={`
            flex-shrink-0
            h-10 w-10
            rounded-xl
            bg-gradient-to-br ${gradientFrom} ${gradientTo}
            flex items-center justify-center
            shadow-sm
          `}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-wider font-bold leading-tight"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-extrabold mt-0.5 leading-none"
            style={{ color: 'var(--color-text)' }}
          >
            {value}
          </p>
          <p
            className="text-[10px] mt-1 leading-tight line-clamp-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────

function SosStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4 animate-pulse"
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl flex-shrink-0"
              style={{ background: 'var(--color-surface-muted)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-2.5 rounded w-2/3"
                style={{ background: 'var(--color-surface-muted)' }}
              />
              <div
                className="h-6 rounded w-1/3"
                style={{ background: 'var(--color-border)' }}
              />
              <div
                className="h-2 rounded w-full"
                style={{ background: 'var(--color-border-muted)' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
