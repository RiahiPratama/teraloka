'use client';

/**
 * TeraLoka — ArticleRow
 * Phase 2 · Batch 7e1 — Content Panel Migration
 * ------------------------------------------------------------
 * Single article row untuk Manajemen table.
 *
 * 2 variants:
 * - compact: dense row dengan title + status + date + aksi
 * - full: dengan extra metrics (views, shares) for trending display
 *
 * actionSlot: render-prop untuk custom action button
 * (biasanya delete button di Manajemen, "Lihat →" di Trending).
 *
 * Usage:
 *   <ArticleRow
 *     article={article}
 *     variant="compact"
 *     actionSlot={
 *       <Button variant="danger" size="sm" onClick={() => openDelete(a)}>
 *         Hapus
 *       </Button>
 *     }
 *   />
 */

import Link from 'next/link';
import { ArticleStatusBadge } from './status-badge';
import { timeAgo, formatNum, type Article } from '@/types/articles';

interface ArticleRowProps {
  article: Article;
  variant?: 'compact' | 'full';
  /** Render-prop untuk action button di kanan row */
  actionSlot?: React.ReactNode;
  /** Override link URL (default: /news/[slug]) */
  href?: string;
  className?: string;
}

export function ArticleRow({
  article,
  variant = 'compact',
  actionSlot,
  href,
  className,
}: ArticleRowProps) {
  const displayDate = article.published_at || article.created_at;

  return (
    <div
      className={`grid items-center gap-3 py-2.5 border-b border-border last:border-0 ${
        variant === 'compact'
          ? 'grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_110px_100px_auto]'
          : 'grid-cols-[1fr_auto_auto]'
      } ${className || ''}`}
    >
      {/* Title + slug */}
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          {article.is_breaking && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-status-critical/12 text-status-critical"
              title="Breaking news"
            >
              BREAKING
            </span>
          )}
          {article.is_viral && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-status-warning/15 text-status-warning"
              title="Viral"
            >
              🔥 VIRAL
            </span>
          )}
          <Link
            href={href ?? `/news/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-text hover:text-brand-teal truncate leading-tight"
          >
            {article.title}
          </Link>
        </div>
        <p className="text-[11px] text-text-subtle font-mono truncate">
          {article.slug}
        </p>
      </div>

      {/* Status badge (compact variant only) */}
      {variant === 'compact' && (
        <div className="hidden sm:block">
          <ArticleStatusBadge status={article.status} size="xs" />
        </div>
      )}

      {/* Metrics (full variant) OR date (compact variant) */}
      {variant === 'full' ? (
        <div className="flex items-center gap-3 text-xs text-text-muted whitespace-nowrap">
          <span title={`${article.view_count} views`}>
            👁 {formatNum(article.view_count)}
          </span>
          <span title={`${article.share_count} shares`}>
            ↗ {formatNum(article.share_count)}
          </span>
        </div>
      ) : (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {timeAgo(displayDate)}
        </span>
      )}

      {/* Action slot */}
      {actionSlot && <div className="justify-self-end">{actionSlot}</div>}
    </div>
  );
}
