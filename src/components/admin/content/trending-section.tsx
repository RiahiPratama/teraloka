'use client';

/**
 * TeraLoka — TrendingSection
 * Phase 2 · Batch 7e2 — Content Panel Tab 1 Complete
 * ------------------------------------------------------------
 * 2-col panel:
 * - Trending Minggu Ini: top 5 articles by viral_score
 * - Perlu Perhatian: stale drafts + review backlog alerts
 *
 * Responsive: 2-col desktop, stacked mobile.
 *
 * Trending → click row → new tab ke /news/[slug]
 * Perlu Perhatian → click alert → scroll ke Manajemen section (via onClick)
 */

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArticleRow } from './article-row';
import {
  sortByViralScore,
  sortByPublishedDate,
  type Article,
} from '@/types/articles';

interface TrendingSectionProps {
  articles: Article[];
  onReviewStaleDrafts?: () => void;
  loading?: boolean;
}

export function TrendingSection({
  articles,
  onReviewStaleDrafts,
  loading = false,
}: TrendingSectionProps) {
  // Top 5 published by viral_score
  const published = articles.filter((a) => a.status === 'published');
  const trending = sortByViralScore(published).slice(0, 5);

  // Stale drafts (> 3 jam)
  const now = Date.now();
  const staleThreshold = 3 * 3600 * 1000;
  const drafts = articles.filter((a) => a.status === 'draft');
  const staleDrafts = drafts.filter(
    (d) => now - new Date(d.created_at).getTime() > staleThreshold
  );

  // Review backlog
  const reviewBacklog = articles.filter((a) => a.status === 'review');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Trending Column */}
      <Card padded>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <h3 className="text-sm font-bold text-text">Trending</h3>
          </div>
          <Link
            href="/office/newsroom/bakabar/hub"
            className="text-xs font-semibold text-brand-teal hover:underline"
          >
            Lihat Semua →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="py-8 text-center text-text-subtle text-sm">
            Belum ada artikel trending
          </div>
        ) : (
          <div className="-mb-2">
            {trending.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                variant="full"
                actionSlot={
                  <Link
                    href={`/news/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-teal text-white hover:bg-brand-teal/90 transition-colors whitespace-nowrap"
                  >
                    Lihat →
                  </Link>
                }
              />
            ))}
          </div>
        )}
      </Card>

      {/* Perlu Perhatian Column */}
      <Card
        padded
        className={
          staleDrafts.length > 0 || reviewBacklog.length > 0
            ? 'bg-status-warning/[0.03] border-status-warning/30'
            : ''
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <h3 className="text-sm font-bold text-text">Perlu Perhatian</h3>
          </div>
          {staleDrafts.length > 0 && onReviewStaleDrafts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReviewStaleDrafts}
              className="text-xs text-status-warning"
            >
              Review →
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-8 rounded bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : staleDrafts.length === 0 && reviewBacklog.length === 0 ? (
          <div className="py-6 text-center">
            <span className="text-2xl">✓</span>
            <p className="text-sm text-text-muted mt-1">
              Semua artikel sudah diproses dengan baik
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {staleDrafts.length > 0 && (
              <AlertItem
                color="warning"
                emoji="🟡"
                text={`${staleDrafts.length} draft belum dipublish > 3 jam`}
              />
            )}
            {reviewBacklog.length > 0 && (
              <AlertItem
                color="info"
                emoji="🔵"
                text={`${reviewBacklog.length} artikel menunggu review editor`}
              />
            )}
            {drafts.length > staleDrafts.length && (
              <AlertItem
                color="neutral"
                emoji="⚪"
                text={`${drafts.length} total draft aktif`}
              />
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ─── Alert Item ─── */

interface AlertItemProps {
  color: 'warning' | 'info' | 'neutral';
  emoji: string;
  text: string;
}

function AlertItem({ color, emoji, text }: AlertItemProps) {
  const colorClass: Record<AlertItemProps['color'], string> = {
    warning: 'text-status-warning',
    info:    'text-status-info',
    neutral: 'text-text-muted',
  };

  return (
    <li
      className={`flex items-start gap-2.5 text-sm ${colorClass[color]} leading-snug`}
    >
      <span className="shrink-0" aria-hidden="true">
        {emoji}
      </span>
      <span>{text}</span>
    </li>
  );
}
