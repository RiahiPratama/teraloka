'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Eye:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:         () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  AlertTriangle: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const CATEGORY_LABEL: Record<string, string> = {
  kesehatan: 'Kesehatan',
  bencana: 'Bencana',
  duka: 'Duka',
  anak_yatim: 'Anak Yatim',
  lansia: 'Lansia',
  hunian_darurat: 'Hunian',
};

interface Campaign {
  id: string;
  title: string;
  slug: string;
  category: string;
  beneficiary_name: string;
  partner_name: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  cover_image_url?: string;
  is_urgent: boolean;
  status: string;
  deadline?: string;
  rejection_reason?: string;
  created_at: string;
  open_flag_count?: number;
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function daysUntil(deadline?: string): { days: number | null; label: string; color: string } {
  if (!deadline) return { days: null, label: '—', color: 'textMuted' };
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { days: diff, label: `Expired`, color: '#EF4444' };
  if (diff === 0) return { days: 0, label: 'Hari ini', color: '#EF4444' };
  if (diff <= 3) return { days: diff, label: `${diff}hari`, color: '#EF4444' };
  if (diff <= 7) return { days: diff, label: `${diff}hari`, color: '#F59E0B' };
  return { days: diff, label: `${diff}hari`, color: '' };
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending_review: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Pending' },
  active:         { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Aktif' },
  completed:      { bg: 'rgba(99,102,241,0.15)', text: '#6366F1', label: 'Selesai' },
  rejected:       { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Ditolak' },
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS TABLE
// ═══════════════════════════════════════════════════════════════

export default function CampaignsTable({
  campaigns,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRowAction,
  showBulkCheckbox = true,
}: {
  campaigns: Campaign[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onRowAction: (action: 'detail' | 'approve' | 'reject', campaign: Campaign) => void;
  showBulkCheckbox?: boolean;
}) {
  const { t } = useContext(AdminThemeContext);

  if (campaigns.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada kampanye
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Coba ubah filter atau search keyword-nya.
        </p>
      </div>
    );
  }

  const allSelected = campaigns.every(c => selectedIds.has(c.id));
  const someSelected = campaigns.some(c => selectedIds.has(c.id));

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
              {showBulkCheckbox && (
                <th style={thStyle(t, 'center', 40)}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={onToggleAll}
                    style={{ cursor: 'pointer', accentColor: '#EC4899' }}
                  />
                </th>
              )}
              <th style={thStyle(t, 'left')}>Kampanye</th>
              <th style={thStyle(t, 'left', 90)}>Status</th>
              <th style={thStyle(t, 'left', 140)}>Progress</th>
              <th style={thStyle(t, 'right', 100)}>Target</th>
              <th style={thStyle(t, 'right', 60)}>Donor</th>
              <th style={thStyle(t, 'center', 80)}>Deadline</th>
              <th style={thStyle(t, 'right', 140)}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, idx) => {
              const pct = c.target_amount > 0
                ? Math.min(Math.round((c.collected_amount / c.target_amount) * 100), 100)
                : 0;
              const ddl = daysUntil(c.deadline);
              const statusStyle = STATUS_STYLE[c.status] ?? { bg: t.navHover, text: t.textDim, label: c.status };
              const isSelected = selectedIds.has(c.id);
              const isLast = idx === campaigns.length - 1;

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                    background: isSelected ? 'rgba(236,72,153,0.05)' : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = t.navHover + '33';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isSelected ? 'rgba(236,72,153,0.05)' : 'transparent';
                  }}
                >
                  {showBulkCheckbox && (
                    <td style={tdStyle(t, 'center')}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(c.id)}
                        style={{ cursor: 'pointer', accentColor: '#EC4899' }}
                      />
                    </td>
                  )}

                  {/* Kampanye (title + meta) */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {c.cover_image_url ? (
                        <img
                          src={c.cover_image_url}
                          alt={c.title}
                          style={{
                            width: 40, height: 40, borderRadius: 8,
                            objectFit: 'cover', flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: t.navHover,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: t.textMuted, fontSize: 9, flexShrink: 0,
                        }}>
                          No img
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: t.textPrimary,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          }}>
                            {c.title}
                          </span>
                          {c.is_urgent && (
                            <span title="Urgent" style={{ color: '#EF4444', fontSize: 9 }}>🔴</span>
                          )}
                          {!!c.open_flag_count && c.open_flag_count > 0 && (
                            <span title={`${c.open_flag_count} fraud alert`} style={{ color: '#DC2626' }}>
                              <Icons.AlertTriangle />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: t.textDim }}>
                          {CATEGORY_LABEL[c.category] ?? c.category}
                          {' · '}
                          {c.beneficiary_name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={tdStyle(t, 'left')}>
                    <span style={{
                      display: 'inline-block',
                      background: statusStyle.bg, color: statusStyle.text,
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 999,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {statusStyle.label}
                    </span>
                  </td>

                  {/* Progress bar */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1, height: 6, borderRadius: 999,
                        background: t.navHover,
                        overflow: 'hidden', minWidth: 60,
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${pct}%`,
                          background: pct >= 75
                            ? 'linear-gradient(90deg, #10B981, #059669)'
                            : pct >= 25
                              ? 'linear-gradient(90deg, #EC4899, #BE185D)'
                              : 'linear-gradient(90deg, #F59E0B, #D97706)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: pct >= 75 ? '#10B981' : t.textPrimary,
                        minWidth: 32, textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                      {shortRupiah(c.collected_amount)}
                    </div>
                  </td>

                  {/* Target */}
                  <td style={tdStyle(t, 'right')}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                      {shortRupiah(c.target_amount)}
                    </span>
                  </td>

                  {/* Donors */}
                  <td style={tdStyle(t, 'right')}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>
                      {c.donor_count ?? 0}
                    </span>
                  </td>

                  {/* Deadline */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: ddl.color || t.textPrimary,
                      padding: ddl.color ? '2px 6px' : 0,
                      background: ddl.color ? ddl.color + '15' : 'transparent',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}>
                      {ddl.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onRowAction('detail', c); }}
                        title="Detail"
                        style={actionBtnStyle(t, 'neutral')}
                      >
                        <Icons.Eye />
                      </button>
                      {c.status === 'pending_review' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('reject', c); }}
                            title="Tolak"
                            style={actionBtnStyle(t, 'danger')}
                          >
                            <Icons.X />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('approve', c); }}
                            title="Approve"
                            style={actionBtnStyle(t, 'success')}
                          >
                            <Icons.Check />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Style helpers ──────────────────────────────────
function thStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10,
    fontWeight: 700,
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    width: width ? `${width}px` : 'auto',
  };
}

function tdStyle(t: any, align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px',
    verticalAlign: 'middle',
    color: t.textPrimary,
  };
}

function actionBtnStyle(t: any, variant: 'neutral' | 'success' | 'danger'): React.CSSProperties {
  const colors = {
    neutral: { bg: t.navHover, text: t.textPrimary, border: t.sidebarBorder },
    success: { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
    danger:  { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
  }[variant];

  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 7,
    border: `1px solid ${colors.border}`,
    background: colors.bg, color: colors.text,
    cursor: 'pointer',
    transition: 'transform 100ms',
  };
}
