'use client';

/**
 * TeraLoka — ArticleStatusBadge
 * Phase 2 · Batch 7e1 — Content Panel Migration
 * ------------------------------------------------------------
 * Thin wrapper around <Badge> untuk article status.
 * Maps ArticleStatus → Badge props via STATUS_CONFIG.
 *
 * Usage:
 *   <ArticleStatusBadge status="published" />
 *   <ArticleStatusBadge status="draft" size="xs" />
 */

import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG, type ArticleStatus } from '@/types/articles';

interface ArticleStatusBadgeProps {
  status: ArticleStatus;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ArticleStatusBadge({
  status,
  size = 'sm',
  className,
}: ArticleStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="status"
      status={config.badgeStatus}
      size={size}
      style_="soft"
      className={className}
    >
      {config.label}
    </Badge>
  );
}
