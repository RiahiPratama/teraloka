'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Types ─────────────────────────────────────────
export interface CampaignCashflow {
  id: string;
  title: string;
  slug: string;
  partner_name: string | null;
  beneficiary_name: string;
  status: string;
  is_urgent: boolean;
  category: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  disbursed_amount: number;
  remaining_at_partner: number;
  disbursement_rate: number;
  report_count: number;
  approved_report_count: number;
  last_report_at: string | null;
  days_since_report: number | null;
  needs_report: boolean;
  created_at: string;
  verified_at: string | null;
  deadline: string | null;
}

// ── Helpers ──────────────────────────────────────
function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function rateColor(rate: number): string {
  if (rate >= 80) return '#10B981'; // green — well disbursed
  if (rate >= 40) return '#F59E0B'; // amber — mid
  if (rate > 0)   return '#EA580C'; // orange — low
  return '#6B7280';                  // gray — zero
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN CASHFLOW TABLE
// ═══════════════════════════════════════════════════════════════

export default function CampaignCashflowTable({
  campaigns,
}: {
  campaigns: CampaignCashflow[];
}) {
  const { t } = useContext(AdminThemeContext);

  if (campaigns.length === 0) {
    return (
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada kampanye dalam rentang ini
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Coba ubah rentang tanggal atau filter.
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
              <th style={thStyle(t, 'left')}>Kampanye</th>
              <th style={thStyle(t, 'right', 110)}>Terkumpul</th>
              <th style={thStyle(t, 'right', 110)}>Disalurkan</th>
              <th style={thStyle(t, 'right', 110)}>Sisa</th>
              <th style={thStyle(t, 'center', 110)}>Rate</th>
              <th style={thStyle(t, 'center', 90)}>Laporan</th>
              <th style={thStyle(t, 'center', 90)}>Update</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, idx) => {
              const isLast = idx === campaigns.length - 1;
              const rc = rateColor(c.disbursement_rate);

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.navHover + '33'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Campaign Info */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {c.is_urgent && (
                        <span style={{
                          fontSize: 8, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                          flexShrink: 0, marginTop: 2,
                        }}>
                          Urgent
                        </span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: t.textPrimary,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          marginBottom: 3,
                        }}>
                          {c.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {c.partner_name && (
                            <span style={{ fontSize: 10, color: '#EC4899', fontWeight: 600 }}>
                              {c.partner_name}
                            </span>
                          )}
                          {c.needs_report && (
                            <span
                              title={`Butuh laporan (${c.days_since_report ?? 'belum ada'} hari sejak laporan terakhir)`}
                              style={{
                                fontSize: 9, fontWeight: 700,
                                padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(234,88,12,0.12)',
                                color: '#EA580C',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                              ⚠ Butuh Laporan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Collected */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                      {shortRupiah(c.collected_amount)}
                    </div>
                    {c.donor_count > 0 && (
                      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                        {c.donor_count} donatur
                      </div>
                    )}
                  </td>

                  {/* Disbursed */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.disbursed_amount > 0 ? '#10B981' : t.textMuted,
                    }}>
                      {shortRupiah(c.disbursed_amount)}
                    </div>
                  </td>

                  {/* Remaining at partner */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: c.remaining_at_partner > 0 ? '#F59E0B' : t.textMuted,
                    }}>
                      {shortRupiah(c.remaining_at_partner)}
                    </div>
                  </td>

                  {/* Rate with mini progress bar */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: rc }}>
                        {c.disbursement_rate}%
                      </span>
                      <div style={{
                        width: 70, height: 4, background: t.navHover,
                        borderRadius: 999, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(c.disbursement_rate, 100)}%`,
                          height: '100%', background: rc,
                          transition: 'width 300ms',
                        }} />
                      </div>
                    </div>
                  </td>

                  {/* Report count */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 700,
                      color: c.report_count > 0 ? t.textPrimary : t.textMuted,
                    }}>
                      <span style={{ fontSize: 10 }}>📄</span>
                      {c.report_count}
                    </div>
                    {c.approved_report_count > 0 && c.approved_report_count !== c.report_count && (
                      <div style={{ fontSize: 9, color: '#10B981', marginTop: 2 }}>
                        {c.approved_report_count} approved
                      </div>
                    )}
                  </td>

                  {/* Days since report */}
                  <td style={tdStyle(t, 'center')}>
                    {c.days_since_report !== null ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: c.days_since_report > 30 ? '#EA580C'
                             : c.days_since_report > 7  ? '#F59E0B'
                             : t.textDim,
                      }}>
                        {c.days_since_report}h lalu
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>
                        belum ada
                      </span>
                    )}
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
    verticalAlign: 'top',
    color: t.textPrimary,
  };
}
