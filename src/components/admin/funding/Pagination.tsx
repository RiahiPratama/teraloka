'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

export default function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
}) {
  const { t } = useContext(AdminThemeContext);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Compute page numbers to show (max 5 + first/last with ellipsis)
  const pageNumbers = computePageNumbers(page, totalPages);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      padding: '12px 0',
      color: t.textPrimary,
    }}>
      {/* Info */}
      <div style={{ fontSize: 12, color: t.textDim }}>
        {total === 0 ? (
          'Tidak ada data'
        ) : (
          <>
            Menampilkan <strong style={{ color: t.textPrimary }}>{startItem}-{endItem}</strong>
            {' dari '}
            <strong style={{ color: t.textPrimary }}>{total.toLocaleString('id-ID')}</strong>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Per-page selector */}
        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: t.textDim }}>Per hal.</label>
            <select
              value={limit}
              onChange={e => onLimitChange(Number(e.target.value))}
              style={{
                padding: '5px 8px',
                borderRadius: 8,
                border: `1px solid ${t.sidebarBorder}`,
                background: t.mainBg,
                color: t.textPrimary,
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {limitOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Page controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PaginationButton
              t={t}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              label="‹"
              title="Prev"
            />

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{
                  padding: '0 6px', fontSize: 12, color: t.textDim,
                }}>
                  …
                </span>
              ) : (
                <PaginationButton
                  key={p}
                  t={t}
                  onClick={() => onPageChange(p as number)}
                  active={p === page}
                  label={String(p)}
                />
              )
            )}

            <PaginationButton
              t={t}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              label="›"
              title="Next"
            />
          </div>
        )}

      </div>
    </div>
  );
}

function PaginationButton({
  t, onClick, active, disabled, label, title,
}: {
  t: any; onClick: () => void;
  active?: boolean; disabled?: boolean;
  label: string; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 32,
        height: 32,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${active ? '#EC4899' : t.sidebarBorder}`,
        background: active ? '#EC4899' : t.mainBg,
        color: active ? '#fff' : (disabled ? t.textMuted : t.textPrimary),
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 120ms',
      }}
    >
      {label}
    </button>
  );
}

function computePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (current > 3) pages.push('...');

  // Middle pages (current-1, current, current+1)
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  // Right ellipsis
  if (current < total - 2) pages.push('...');

  // Last page
  if (total > 1) pages.push(total);

  return pages;
}
