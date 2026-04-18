'use client';

/**
 * TeraLoka — MissionControlCard
 * Phase 2 · Batch 4a — Domain Components
 * ------------------------------------------------------------
 * Hero card yang merepresentasikan "state platform hari ini".
 * Dipakai di 2 tempat:
 * - Sidebar atas (compact variant) — hero nav feature
 * - Dashboard body (full variant) — spotlight panel
 *
 * Visual:
 * - Gradient background (brand teal → cyan)
 * - Badge "PLATFORM INSIGHT" kecil di atas
 * - Urgent count besar (e.g. "11 aksi menunggu")
 * - Progress bar (dihandled vs total)
 * - Breakdown chips (tiap service yg punya pending)
 *
 * Contoh:
 *   <MissionControlCard
 *     title="Mission Control"
 *     urgentCount={11}
 *     totalCount={15}
 *     breakdown={[
 *       { service: 'balapor', label: 'Laporan', count: 4 },
 *       { service: 'bakabar', label: 'Artikel', count: 7 },
 *     ]}
 *     subtitle="11 item perlu perhatianmu sekarang"
 *   />
 *
 *   // Compact variant untuk sidebar
 *   <MissionControlCard
 *     urgentCount={11}
 *     totalCount={15}
 *     variant="compact"
 *   />
 *
 *   // Empty celebratory state
 *   <MissionControlCard
 *     urgentCount={0}
 *     totalCount={0}
 *     emptyTitle="Semua beres!"
 *     emptyMessage="Tidak ada aksi tertunda. Enjoy the peace."
 *   />
 */

import { CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, type ServiceKey } from '@/components/ui/badge';

interface MissionBreakdown {
  service: ServiceKey;
  label: string;
  count: number;
}

type MissionVariant = 'full' | 'compact';

export interface MissionControlCardProps {
  title?: string;
  subtitle?: string;
  urgentCount: number;
  /** Total semua aksi (handled + pending). Untuk progress bar. */
  totalCount?: number;
  breakdown?: MissionBreakdown[];
  variant?: MissionVariant;
  emptyTitle?: string;
  emptyMessage?: string;
  onClick?: () => void;
  className?: string;
}

export function MissionControlCard({
  title = 'Mission Control',
  subtitle,
  urgentCount,
  totalCount,
  breakdown,
  variant = 'full',
  emptyTitle = 'Semua beres!',
  emptyMessage = 'Tidak ada aksi tertunda saat ini.',
  onClick,
  className,
}: MissionControlCardProps) {
  const isEmpty = urgentCount === 0;
  const isCompact = variant === 'compact';

  // Progress calculation — handled / total
  const total = totalCount ?? urgentCount;
  const handled = Math.max(total - urgentCount, 0);
  const progressPct = total > 0 ? Math.round((handled / total) * 100) : 0;

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-brand-teal via-brand-teal-light to-brand-blue',
        'text-white shadow-[0_8px_32px_-12px_rgba(0,53,38,0.4)]',
        isCompact ? 'p-3.5' : 'p-5',
        onClick && 'cursor-pointer hover:brightness-105 transition',
        className
      )}
    >
      {/* Decorative mint accent */}
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-teal-mint/15 blur-xl pointer-events-none"
      />

      <div className="relative">
        {/* Header eyebrow */}
        <div className="flex items-center gap-1.5 mb-2">
          <Zap size={isCompact ? 10 : 12} className="text-brand-orange-light" />
          <span
            className={cn(
              'font-bold tracking-wider uppercase text-brand-orange-light/90',
              isCompact ? 'text-[9px]' : 'text-[10px]'
            )}
          >
            {title}
          </span>
        </div>

        {isEmpty ? (
          /* Empty celebratory state */
          <div className="flex items-start gap-2.5">
            <CheckCircle2
              size={isCompact ? 20 : 24}
              className="text-brand-teal-mint shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'font-bold text-white leading-tight',
                  isCompact ? 'text-sm' : 'text-base'
                )}
              >
                {emptyTitle}
              </div>
              {!isCompact && (
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  {emptyMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Main counter */}
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className={cn(
                  'font-bold tabular-nums leading-none text-white',
                  isCompact ? 'text-2xl' : 'text-4xl'
                )}
              >
                {urgentCount.toLocaleString('id-ID')}
              </span>
              <span
                className={cn(
                  'text-white/75 font-medium',
                  isCompact ? 'text-[11px]' : 'text-xs'
                )}
              >
                aksi menunggu
              </span>
            </div>

            {/* Subtitle / context */}
            {!isCompact && subtitle && (
              <p className="text-xs text-white/70 mb-3 leading-relaxed">
                {subtitle}
              </p>
            )}

            {/* Progress bar */}
            {totalCount !== undefined && total > 0 && (
              <div className={isCompact ? 'mt-2' : 'mt-3'}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-white/70 font-medium',
                      isCompact ? 'text-[10px]' : 'text-[11px]'
                    )}
                  >
                    Progress hari ini
                  </span>
                  <span
                    className={cn(
                      'text-white/90 font-semibold tabular-nums',
                      isCompact ? 'text-[10px]' : 'text-[11px]'
                    )}
                  >
                    {handled} / {total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-orange transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  />
                </div>
              </div>
            )}

            {/* Breakdown chips (full variant only) */}
            {!isCompact && breakdown && breakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                {breakdown.map((item) => (
                  <Badge
                    key={item.service}
                    variant="service"
                    service={item.service}
                    style_="solid"
                    size="xs"
                    className="!bg-white/15 !text-white ring-1 ring-white/20 backdrop-blur-sm"
                  >
                    {item.label} · {item.count}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
