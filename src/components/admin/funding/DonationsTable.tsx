'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Eye:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:         () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User:      () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

/**
 * Shared donation shape — single source of truth.
 * Required fields used by table; optional fields used by parent detail view.
 */
export interface Donation {
  id: string;
  donation_code: string;
  campaign_id: string;
  donor_id?: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  verification_status: string; // pending | verified | rejected
  verified_at?: string;
  verified_by_role?: string | null;
  rejection_reason?: string;
  created_at: string;
  // Enriched
  campaign?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  } | null;
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 10_000) return 'Rp ' + Math.round(n / 1_000) + 'rb';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'rb';
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

function isRoundAmount(amount: number): boolean {
  return amount > 0 && amount % 1000 === 0;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Pending' },
  verified:    { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Verified' },
  rejected:    { bg: 'rgba(239,68,68,0.15)',  text: '#EF4444', label: 'Rejected' },
  under_audit: { bg: 'rgba(234,179,8,0.15)',  text: '#CA8A04', label: 'Under Audit' },
};

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending',
  active: 'Aktif',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

// ═══════════════════════════════════════════════════════════════
// DONATIONS TABLE
// ═══════════════════════════════════════════════════════════════

export default function DonationsTable({
  donations,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRowAction,
  showBulkCheckbox = true,
}: {
  donations: Donation[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onRowAction: (action: 'detail' | 'verify' | 'reject', donation: Donation) => void;
  showBulkCheckbox?: boolean;
}) {
  const { t } = useContext(AdminThemeContext);

  if (donations.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada donasi
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Coba ubah filter atau search keyword-nya.
        </p>
      </div>
    );
  }

  const allSelected = donations.every(d => selectedIds.has(d.id));
  const someSelected = donations.some(d => selectedIds.has(d.id));
  const now = Date.now();

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
              <th style={thStyle(t, 'left', 110)}>Kode</th>
              <th style={thStyle(t, 'left')}>Donor</th>
              <th style={thStyle(t, 'left')}>Kampanye</th>
              <th style={thStyle(t, 'right', 120)}>Jumlah</th>
              <th style={thStyle(t, 'center', 90)}>Waktu</th>
              <th style={thStyle(t, 'center', 85)}>Status</th>
              <th style={thStyle(t, 'right', 120)}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d, idx) => {
              const statusStyle = STATUS_STYLE[d.verification_status]
                ?? { bg: t.navHover, text: t.textDim, label: d.verification_status };
              const isSelected = selectedIds.has(d.id);
              const isLast = idx === donations.length - 1;
              const isPending = d.verification_status === 'pending';
              const ageHours = (now - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
              const isUrgent = isPending && ageHours > 24;
              const isRound = isRoundAmount(d.amount);
              const campaignInactive = d.campaign && ['completed', 'rejected'].includes(d.campaign.status);

              return (
                <tr
                  key={d.id}
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
                        onChange={() => onToggleSelect(d.id)}
                        style={{ cursor: 'pointer', accentColor: '#EC4899' }}
                      />
                    </td>
                  )}

                  {/* Donation Code */}
                  <td style={tdStyle(t, 'left')}>
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace',
                      fontWeight: 700,
                      color: t.textPrimary,
                      background: t.navHover,
                      padding: '3px 8px',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}>
                      {d.donation_code}
                    </span>
                  </td>

                  {/* Donor */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: t.textPrimary,
                        }}>
                          {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
                        </span>
                        {isRound && (
                          <span title="Nominal bulat (tanpa kode unik) — suspicious" style={{ color: '#8B5CF6' }}>
                            🎯
                          </span>
                        )}
                      </div>
                      {d.donor_phone && (
                        <div style={{ fontSize: 11, color: t.textDim, fontFamily: 'monospace' }}>
                          {d.donor_phone}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Campaign */}
                  <td style={tdStyle(t, 'left')}>
                    {d.campaign ? (
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: t.textPrimary,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          marginBottom: 2,
                        }}>
                          {d.campaign.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            padding: '2px 6px', borderRadius: 4,
                            background: campaignInactive ? 'rgba(99,102,241,0.15)' : t.navHover,
                            color: campaignInactive ? '#6366F1' : t.textDim,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {CAMPAIGN_STATUS_LABEL[d.campaign.status] ?? d.campaign.status}
                          </span>
                          {campaignInactive && (
                            <span title="Kampanye tidak aktif" style={{ fontSize: 10 }}>⚠️</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>
                        Kampanye tidak ditemukan
                      </span>
                    )}
                  </td>

                  {/* Amount */}
                  <td style={tdStyle(t, 'right')}>
                    <div>
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: t.textPrimary,
                      }}>
                        {shortRupiah(d.amount)}
                      </span>
                      {d.operational_fee > 0 && (
                        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                          + fee {shortRupiah(d.operational_fee)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Time Ago */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isUrgent ? '#EF4444' : t.textDim,
                      padding: isUrgent ? '2px 6px' : 0,
                      background: isUrgent ? 'rgba(239,68,68,0.15)' : 'transparent',
                      borderRadius: 6,
                      display: 'inline-block',
                    }}>
                      {timeAgo(d.created_at)}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{
                        display: 'inline-block',
                        background: statusStyle.bg, color: statusStyle.text,
                        fontSize: 10, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {statusStyle.label}
                      </span>
                      {/* ⭐ Verified by role badge */}
                      {d.verification_status === 'verified' && d.verified_by_role && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 999,
                          background: d.verified_by_role === 'penggalang'
                            ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: d.verified_by_role === 'penggalang' ? '#B45309' : '#047857',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}>
                          {d.verified_by_role === 'penggalang' ? '👤 Penggalang' : '🛡️ Admin'}
                        </span>
                      )}
                      {d.verification_status === 'rejected' && d.verified_by_role && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 999,
                          background: d.verified_by_role === 'penggalang'
                            ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: d.verified_by_role === 'penggalang' ? '#B45309' : '#DC2626',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}>
                          {d.verified_by_role === 'penggalang' ? '👤 Penggalang' : '🛡️ Admin'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onRowAction('detail', d); }}
                        title="Detail"
                        style={actionBtnStyle(t, 'neutral')}
                      >
                        <Icons.Eye />
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('reject', d); }}
                            title="Tolak"
                            style={actionBtnStyle(t, 'danger')}
                          >
                            <Icons.X />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onRowAction('verify', d); }}
                            title="Verify"
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
