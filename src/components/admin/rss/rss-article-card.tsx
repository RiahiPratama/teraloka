'use client';

/**
 * TeraLoka — RSSArticleCard
 * Phase 2 · Batch 7d — Admin RSS Management
 * ------------------------------------------------------------
 * Single RSS article card untuk review queue.
 *
 * Layout:
 * - Left: cover image (140px, optional)
 * - Right: source badge + date + title + excerpt + actions
 * - Bottom actions: "Baca asli" (external link) + Tolak + Publish
 *
 * Actions:
 * - Approve → publish ke BAKABAR (POST /admin/rss/:id/approve)
 * - Reject  → buang artikel (POST /admin/rss/:id/reject)
 * - Buka source → tab baru ke source_url
 *
 * Behavior: straight action, no confirmation modal (per PRD decision 7d).
 * Parent handle API call + toast + remove row.
 */

import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  formatArticleDate,
  getSourceColor,
  type RSSArticle,
} from '@/types/rss';

export interface RSSArticleCardProps {
  article: RSSArticle;
  /** Callback approve — parent handle API + toast + remove */
  onApprove: (id: string) => void;
  /** Callback reject — parent handle API + toast + remove */
  onReject: (id: string) => void;
  /** ID yang lagi di-process — disable buttons di card tersebut */
  processingId?: string | null;
  className?: string;
}

export function RSSArticleCard({
  article,
  onApprove,
  onReject,
  processingId,
  className,
}: RSSArticleCardProps) {
  const isProcessing = processingId === article.id;
  const sourceColor = getSourceColor(article.source_name);

  return (
    <article
      className={cn(
        'bg-surface border border-border rounded-xl overflow-hidden',
        'flex flex-col md:flex-row gap-0',
        'transition-all',
        isProcessing && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* Cover image */}
      {article.image_url && (
        <div className="w-full md:w-36 h-40 md:h-auto shrink-0 overflow-hidden bg-surface-muted">
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 md:p-5 min-w-0 flex flex-col gap-2">
        {/* Source badge + date */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white whitespace-nowrap"
            style={{ background: sourceColor }}
          >
            {article.source_name}
          </span>
          <span className="text-[11px] text-text-muted tabular-nums">
            {formatArticleDate(article.published_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-text leading-snug line-clamp-2">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-[13px] text-text-muted leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5',
              'text-[12px] font-semibold text-brand-teal-light',
              'hover:underline focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-brand-teal/30 rounded px-1 -mx-1'
            )}
          >
            <ExternalLink size={12} />
            Baca asli
          </a>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => onReject(article.id)}
            disabled={isProcessing}
            className={cn(
              'inline-flex items-center justify-center gap-1.5',
              'h-8 px-3 text-xs font-semibold rounded-lg',
              'transition-colors duration-150 select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'focus-visible:ring-offset-background focus-visible:ring-status-critical',
              'bg-surface text-status-critical border border-status-critical/30',
              'hover:bg-status-critical/8',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            <XCircle size={12} />
            Tolak
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove(article.id)}
            disabled={isProcessing}
            loading={isProcessing}
            leftIcon={!isProcessing ? <CheckCircle2 size={12} /> : undefined}
          >
            {isProcessing ? 'Proses...' : 'Publish'}
          </Button>
        </div>
      </div>
    </article>
  );
}
