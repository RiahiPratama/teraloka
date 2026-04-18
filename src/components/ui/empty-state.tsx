'use client';

/**
 * TeraLoka — EmptyState
 * Phase 2 · Batch 3c — Feedback & Navigation
 * ------------------------------------------------------------
 * Komponen KRITIKAL untuk pre-launch reality TeraLoka.
 * Saat ini: 0 users, 0 campaigns, 4 listings, 7 articles draft.
 * Mayoritas KPI/list akan kosong — tampilan empty state harus welcoming
 * dan informatif, bukan alarming.
 *
 * Tone PRD:
 * - Informative, bukan apologetic ("Belum ada data" ≠ "Maaf, data tidak tersedia")
 * - Forward-looking ("Akan aktif setelah..." bukan "Tidak tersedia")
 * - Actionable (setiap empty state punya CTA ke aksi relevan)
 *
 * Variants:
 * - default  → standard empty state (icon + title + desc + action)
 * - muted    → inline section version (no border, compact)
 * - coming   → "Coming soon" feature (placeholder untuk DAU chart, Anomaly, dll)
 *
 * Sizes:
 * - sm → inline/compact (card kecil)
 * - md → default (section panel)
 * - lg → full page / center of app
 *
 * Contoh:
 *   // KPI Users dengan 0 users
 *   <EmptyState
 *     icon={<Users size={28} />}
 *     title="Belum ada user"
 *     description="User akan muncul setelah launch."
 *     action={{ label: 'Kelola Users', onClick: () => router.push('/admin/users') }}
 *     size="sm"
 *   />
 *
 *   // Coming soon feature
 *   <EmptyState
 *     variant="coming"
 *     icon={<Activity size={28} />}
 *     title="DAU Chart"
 *     description="Chart akan aktif setelah user aktif 7 hari berturut."
 *     helper="Estimasi: Setelah launch"
 *   />
 *
 *   // Tidak ada tindakan
 *   <EmptyState
 *     icon={<CheckCircle2 size={32} />}
 *     title="Semua beres!"
 *     description="Tidak ada tindakan tertunda. Enjoy the peace."
 *     variant="muted"
 *     tone="healthy"
 *   />
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type EmptyVariant = 'default' | 'muted' | 'coming';
type EmptySize = 'sm' | 'md' | 'lg';
type EmptyTone = 'neutral' | 'healthy' | 'info' | 'warning';

interface EmptyAction {
  label: string;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
}

export interface EmptyStateProps {
  /** Icon component (biasanya dari Lucide, ukuran default ikut size prop) */
  icon?: ReactNode;
  /** Judul utama (bold, harus ada) */
  title: string;
  /** Deskripsi/subtitle */
  description?: string;
  /** Caption tambahan di bawah (e.g., "Estimasi: Setelah launch") */
  helper?: string;
  /** Tombol aksi utama */
  action?: EmptyAction;
  /** Tombol aksi sekunder (biasanya "Pelajari lebih lanjut") */
  secondaryAction?: EmptyAction;
  variant?: EmptyVariant;
  size?: EmptySize;
  /** Tone warna icon container — default neutral (abu) */
  tone?: EmptyTone;
  className?: string;
}

const SIZE_STYLES: Record<EmptySize, { container: string; iconWrap: string; title: string; desc: string; gap: string }> = {
  sm: {
    container: 'py-5 px-4',
    iconWrap: 'h-10 w-10',
    title: 'text-sm font-semibold',
    desc: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    container: 'py-8 px-6',
    iconWrap: 'h-14 w-14',
    title: 'text-base font-bold',
    desc: 'text-sm',
    gap: 'gap-3',
  },
  lg: {
    container: 'py-14 px-8',
    iconWrap: 'h-20 w-20',
    title: 'text-xl font-bold',
    desc: 'text-base',
    gap: 'gap-4',
  },
};

const VARIANT_CONTAINER: Record<EmptyVariant, string> = {
  default:
    'bg-surface border border-dashed border-border rounded-xl',
  muted: 'bg-transparent',
  coming:
    'bg-surface-muted border border-dashed border-border rounded-xl',
};

const TONE_ICON_BG: Record<EmptyTone, string> = {
  neutral: 'bg-surface-muted text-text-muted',
  healthy: 'bg-status-healthy/10 text-status-healthy',
  info: 'bg-status-info/10 text-status-info',
  warning: 'bg-status-warning/10 text-status-warning',
};

/* ─── Render single action (button atau link) ─── */

function renderAction(
  action: EmptyAction | undefined,
  variant: 'primary' | 'secondary',
  size: 'sm' | 'md'
) {
  if (!action) return null;
  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
          'transition-colors duration-150 select-none',
          size === 'sm' ? 'h-8 px-3 text-xs' : 'h-[38px] px-4 text-sm',
          variant === 'primary'
            ? 'bg-brand-teal text-white hover:bg-brand-teal-light'
            : 'bg-surface text-text border border-border hover:bg-surface-muted'
        )}
      >
        {action.label}
      </a>
    );
  }
  return (
    <Button
      variant={variant === 'primary' ? 'primary' : 'secondary'}
      size={size}
      onClick={action.onClick}
      loading={action.loading}
    >
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  helper,
  action,
  secondaryAction,
  variant = 'default',
  size = 'md',
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  const styles = SIZE_STYLES[size];
  const btnSize: 'sm' | 'md' = size === 'sm' ? 'sm' : 'md';

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        VARIANT_CONTAINER[variant],
        styles.container,
        styles.gap,
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full shrink-0',
            styles.iconWrap,
            TONE_ICON_BG[tone]
          )}
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col items-center gap-1 max-w-md">
        <h3 className={cn(styles.title, 'text-text leading-tight')}>
          {title}
        </h3>
        {description && (
          <p className={cn(styles.desc, 'text-text-muted leading-relaxed')}>
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {renderAction(action, 'primary', btnSize)}
          {renderAction(secondaryAction, 'secondary', btnSize)}
        </div>
      )}

      {helper && (
        <p className="text-xs text-text-subtle mt-1">{helper}</p>
      )}
    </div>
  );
}
