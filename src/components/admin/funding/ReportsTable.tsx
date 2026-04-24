'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Eye:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ── Types ─────────────────────────────────────────
export interface UsageReport {
  id: string;
  campaign_id: string;
  submitted_by: string;
  report_number: number;
  title: string;
  description: string;
  amount_used: number;
  items: any[] | null;
  proof_photos: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
    slug: string;
    partner_name: string | null;
    beneficiary_name: string;
    collected_amount: number;
    status: string;
  } | null;
  // Detail-only enrichment (from /:id endpoint)
  sibling_reports?: Array<{
    id: string;
    report_number: number;
    amount_used: number;
    status: string;
    created_at: string;
  }>;
  campaign_already_approved_disbursement?: number;
}

// ── Helpers ──────────────────────────────────────
function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}bl lalu`;
  return `${Math.floor(months / 12)}th lalu`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Pending' },
  approved: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Rejected' },
};

// ═══════════════════════════════════════════════════════════════
// REPORTS TABLE
// ═══════════════════════════════════════════════════════════════

export default function ReportsTable({
  reports,
  onRowAction,
}: {
  reports: UsageReport[];
  onRowAction: (action: 'view' | 'approve' | 'reject', report: UsageReport) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  if (reports.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada laporan
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Laporan akan muncul setelah partner submit atau admin buat on-behalf.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
              <th style={thStyle(t, 'center', 60)}>#</th>
              <th style={thStyle(t, 'left')}>Laporan & Kampanye</th>
              <th style={thStyle(t, 'right', 110)}>Jumlah</th>
              <th style={thStyle(t, 'center', 80)}>Items</th>
              <th style={thStyle(t, 'center', 90)}>Bukti</th>
              <th style={thStyle(t, 'center', 90)}>Status</th>
              <th style={thStyle(t, 'center', 90)}>Waktu</th>
              <th style={thStyle(t, 'right', 130)}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, idx) => {
              const isLast = idx === reports.length - 1;
              const statusStyle = STATUS_STYLE[r.status] ?? {
                bg: t.navHover, text: t.textDim, label: r.status,
              };
              const isPending = r.status === 'pending';
              const itemsCount = Array.isArray(r.items) ? r.items.length : 0;
              const photosCount = Array.isArray(r.proof_photos) ? r.proof_photos.length : 0;

              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.navHover + '33'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Report Number */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: t.textDim, background: t.navHover,
                      padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                      fontFamily: 'monospace',
                    }}>
                      #{r.report_number}
                    </span>
                  </td>

                  {/* Title & Campaign */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: t.textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                        marginBottom: 3,
                      }}>
                        {r.title}
                      </div>
                      {r.campaign && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, color: '#EC4899', fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
                            whiteSpace: 'nowrap',
                          }}>
                            {r.campaign.partner_name ?? 'Tanpa partner'}
                          </span>
                          <span style={{ fontSize: 9, color: t.textMuted }}>·</span>
                          <span style={{
                            fontSize: 10, color: t.textDim,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                            maxWidth: 280,
                          }}>
                            {r.campaign.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Amount */}
                  <td style={tdStyle(t, 'right')}>
                    <span style={{
                      fontSize: 14, fontWeight: 800,
                      color: r.status === 'approved' ? '#10B981' : t.textPrimary,
                    }}>
                      {shortRupiah(r.amount_used)}
                    </span>
                  </td>

                  {/* Items count */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: itemsCount > 0 ? t.textPrimary : t.textMuted,
                    }}>
                      {itemsCount > 0 ? `📦 ${itemsCount}` : '-'}
                    </span>
                  </td>

                  {/* Photos count */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: photosCount > 0 ? t.textPrimary : t.textMuted,
                    }}>
                      {photosCount > 0 ? `📸 ${photosCount}` : '-'}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      display: 'inline-block',
                      background: statusStyle.bg, color: statusStyle.text,
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 999,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {statusStyle.label}
                    </span>
                  </td>

                  {/* Time Ago */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {timeAgo(r.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onRowAction('view', r); }}
                        title="Detail"
                        style={actionBtnStyle(t, 'neutral')}
                      >
                        <Icons.Eye />
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('reject', r); }}
                            title="Tolak"
                            style={actionBtnStyle(t, 'danger')}
                          >
                            <Icons.X />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('approve', r); }}
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

// ── Style helpers ────────────────────────────────

function thStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
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
    danger:  { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
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
