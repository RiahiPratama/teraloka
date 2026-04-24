'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Eye: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

/**
 * Donation shape returned by /admin/fees/pending
 * (includes enriched campaign data)
 */
export interface PendingFeeDonation {
  id: string;
  donation_code: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  verification_status: string;
  verified_at: string;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
    slug: string;
    partner_name: string;
    beneficiary_name: string;
    status: string;
  } | null;
}

// ── Helpers ──────────────────────────────────────

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function ageColor(days: number): string {
  if (days > 60) return '#DC2626'; // critical
  if (days > 30) return '#EA580C'; // overdue
  if (days > 7)  return '#F59E0B'; // warning
  return '#10B981'; // ok
}

// ═══════════════════════════════════════════════════════════════
// PENDING FEES TABLE
// ═══════════════════════════════════════════════════════════════

export default function PendingFeesTable({
  donations,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  donations: PendingFeeDonation[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
}) {
  const { t } = useContext(AdminThemeContext);

  if (donations.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          ✓ Semua fee sudah diselesaikan!
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Tidak ada donasi yang fee-nya masih pending remittance.
        </p>
      </div>
    );
  }

  const allSelected = donations.every(d => selectedIds.has(d.id));
  const someSelected = donations.some(d => selectedIds.has(d.id));

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
              <th style={thStyle(t, 'center', 40)}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={onToggleAll}
                  style={{ cursor: 'pointer', accentColor: '#EC4899' }}
                />
              </th>
              <th style={thStyle(t, 'left', 110)}>Kode</th>
              <th style={thStyle(t, 'left')}>Donor</th>
              <th style={thStyle(t, 'left')}>Partner & Kampanye</th>
              <th style={thStyle(t, 'right', 100)}>Fee</th>
              <th style={thStyle(t, 'center', 110)}>Usia</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d, idx) => {
              const isSelected = selectedIds.has(d.id);
              const isLast = idx === donations.length - 1;
              const age = daysSince(d.verified_at);
              const color = ageColor(age);
              const feeZero = d.operational_fee === 0;

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
                  <td style={tdStyle(t, 'center')}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(d.id)}
                      disabled={feeZero}
                      title={feeZero ? 'Fee = 0, tidak perlu di-settle' : undefined}
                      style={{
                        cursor: feeZero ? 'not-allowed' : 'pointer',
                        accentColor: '#EC4899',
                        opacity: feeZero ? 0.3 : 1,
                      }}
                    />
                  </td>

                  {/* Donation Code */}
                  <td style={tdStyle(t, 'left')}>
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                      color: t.textPrimary, background: t.navHover,
                      padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                    }}>
                      {d.donation_code}
                    </span>
                  </td>

                  {/* Donor */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
                        {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
                      </div>
                      <div style={{ fontSize: 10, color: t.textDim }}>
                        Donasi {shortRupiah(d.amount)}
                      </div>
                    </div>
                  </td>

                  {/* Partner & Campaign */}
                  <td style={tdStyle(t, 'left')}>
                    {d.campaign ? (
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#EC4899',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', marginBottom: 2,
                        }}>
                          {d.campaign.partner_name || '(tanpa partner)'}
                        </div>
                        <div style={{
                          fontSize: 11, color: t.textDim,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                        }}>
                          {d.campaign.title}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>
                        Kampanye tidak ditemukan
                      </span>
                    )}
                  </td>

                  {/* Fee */}
                  <td style={tdStyle(t, 'right')}>
                    {feeZero ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: t.textMuted,
                        fontStyle: 'italic',
                      }}>
                        Rp 0
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: '#EC4899',
                      }}>
                        {shortRupiah(d.operational_fee)}
                      </span>
                    )}
                  </td>

                  {/* Age */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800, color,
                        padding: '2px 8px', borderRadius: 6,
                        background: color + '18',
                      }}>
                        {age}h
                      </span>
                      <span style={{ fontSize: 9, color: t.textMuted }}>
                        verified {new Date(d.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
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
