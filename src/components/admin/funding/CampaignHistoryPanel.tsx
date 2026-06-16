'use client';

// [CAMPAIGN-INLINE-HISTORY] Panel histori transaksi per-kampanye (expand inline di
// CampaignsTable). Lazy fetch 2 endpoint prod (paralel) + merge by donation_id:
//   1. GET /funding/admin/donations?campaign_id=<id>  → histori donasi (status, donor,
//      nominal, verified_at) — trial-balance LEAN tidak punya field ini.
//   2. GET /funding/admin/campaigns/<id>/trial-balance → agregat recon + effective_amount
//      + flag G1/G4 + disbursement.
// FE only — NOL perubahan backend.

import { useEffect, useState } from 'react';
import { formatRupiah } from '@/utils/format';
import type { AdminTheme } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Types (subset yang dipakai) ──────────────────────────────────
interface DonationRow {
  id: string;
  donation_code?: string;
  donor_name: string;
  is_anonymous: boolean;
  amount: number;
  total_transfer: number;
  verification_status: string;
  verified_at?: string | null;
  created_at: string;
}

interface TrialBalance {
  tie_recon?: {
    verified: number;
    disbursed: number;
    expected_sisa: number;
    matches: boolean;
  };
  donations?: Array<{ donation_id: string; effective_amount: number; has_journal: boolean }>;
  disbursements?: Array<{ disbursement_id: string; amount: number; status: string; has_journal: boolean }>;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Pending' },
  verified:    { bg: 'rgba(16,185,129,0.15)', text: '#34D399', label: 'Verified' },
  rejected:    { bg: 'rgba(239,68,68,0.15)',  text: '#F87171', label: 'Rejected' },
  under_audit: { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA', label: 'Tahan Audit' },
};

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════

export default function CampaignHistoryPanel({
  campaignId,
  t,
}: {
  campaignId: string;
  t: AdminTheme;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [tb, setTb] = useState<TrialBalance | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      const tk = localStorage.getItem('tl_token');
      if (!tk) {
        setError('Sesi admin tidak ditemukan. Login ulang.');
        setLoading(false);
        return;
      }
      try {
        const [dRes, tRes] = await Promise.all([
          fetch(`${API_URL}/funding/admin/donations?campaign_id=${campaignId}&limit=100&sort=newest`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/campaigns/${campaignId}/trial-balance`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
        ]);
        const dJson = await dRes.json().catch(() => null);
        const tJson = await tRes.json().catch(() => null);
        if (cancelled) return;

        if (!dRes.ok || !dJson?.success) {
          setError(dJson?.error?.message || 'Gagal memuat histori donasi.');
          setLoading(false);
          return;
        }
        setDonations(dJson.data ?? []);
        // trial-balance opsional: kalau gagal, histori tetap tampil tanpa agregat
        setTb(tRes.ok && tJson?.success ? tJson.data : null);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Koneksi bermasalah.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Merge effective_amount + G1 (has_journal) by donation_id
  const tbByDonation = new Map<string, { effective_amount: number; has_journal: boolean }>();
  (tb?.donations ?? []).forEach(d =>
    tbByDonation.set(d.donation_id, { effective_amount: d.effective_amount, has_journal: d.has_journal })
  );

  const wrap: React.CSSProperties = { padding: '16px 20px', background: t.deepBg };

  if (loading) {
    return (
      <div style={{ ...wrap, fontSize: 12, color: t.textDim }}>Memuat histori transaksi…</div>
    );
  }

  if (error) {
    return (
      <div style={wrap}>
        <div style={{
          fontSize: 12, color: '#F87171',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          ⚠ {error}
        </div>
      </div>
    );
  }

  const recon = tb?.tie_recon;
  const disbursements = tb?.disbursements ?? [];

  return (
    <div style={wrap}>
      {/* Strip agregat (recon) */}
      {recon && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'stretch',
        }}>
          <AggStat label="Verified" value={recon.verified} color="#34D399" t={t} />
          <AggStat label="Disbursed" value={recon.disbursed} color="#60A5FA" t={t} />
          <AggStat label="Sisa Dana" value={recon.expected_sisa} color={t.accent} t={t} highlight />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10,
            background: recon.matches ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${recon.matches ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            fontSize: 11, fontWeight: 700,
            color: recon.matches ? '#34D399' : '#FBBF24',
          }}>
            {recon.matches ? '✓ Recon tie' : '⚠ Recon selisih'}
          </div>
        </div>
      )}

      {/* Tabel histori donasi */}
      {donations.length === 0 ? (
        <div style={{ fontSize: 12, color: t.textDim, padding: '8px 0' }}>
          Belum ada donasi untuk kampanye ini.
        </div>
      ) : (
        <div style={{
          border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: 'hidden',
          background: t.card,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: t.navHover + '55', borderBottom: `1px solid ${t.cardBorder}` }}>
                <th style={hCell(t, 'left')}>Status</th>
                <th style={hCell(t, 'left')}>Donor</th>
                <th style={hCell(t, 'right')}>Nominal</th>
                <th style={hCell(t, 'right')}>Total Transfer</th>
                <th style={hCell(t, 'right')}>Efektif</th>
                <th style={hCell(t, 'left')}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, i) => {
                const st = STATUS_STYLE[d.verification_status]
                  ?? { bg: t.navHover, text: t.textDim, label: d.verification_status };
                const merged = tbByDonation.get(d.id);
                const g1 = merged && merged.has_journal === false && d.verification_status === 'verified';
                return (
                  <tr key={d.id} style={{ borderBottom: i === donations.length - 1 ? 'none' : `1px solid ${t.cardBorder}` }}>
                    <td style={bCell(t, 'left')}>
                      <span style={{
                        display: 'inline-block', background: st.bg, color: st.text,
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {st.label}
                      </span>
                      {g1 && (
                        <span title="G1: verified tanpa jurnal posted" style={{
                          marginLeft: 5, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(239,68,68,0.15)', color: '#F87171',
                        }}>
                          G1
                        </span>
                      )}
                    </td>
                    <td style={bCell(t, 'left')}>
                      <span style={{ color: t.textPrimary, fontWeight: 600 }}>
                        {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
                      </span>
                      {d.donation_code && (
                        <span style={{ marginLeft: 6, color: t.textDim, fontFamily: 'monospace', fontSize: 10 }}>
                          {d.donation_code}
                        </span>
                      )}
                    </td>
                    <td style={{ ...bCell(t, 'right'), fontVariantNumeric: 'tabular-nums', color: t.textPrimary }}>
                      {formatRupiah(d.amount)}
                    </td>
                    <td style={{ ...bCell(t, 'right'), fontVariantNumeric: 'tabular-nums', color: t.textMuted }}>
                      {formatRupiah(d.total_transfer)}
                    </td>
                    <td style={{ ...bCell(t, 'right'), fontVariantNumeric: 'tabular-nums', color: merged ? t.textPrimary : t.textDim }}>
                      {merged ? formatRupiah(merged.effective_amount) : '—'}
                    </td>
                    <td style={{ ...bCell(t, 'left'), color: t.textDim }}>{fmtDate(d.verified_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Disbursement ringkas */}
      {disbursements.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: t.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
          }}>
            Pencairan ({disbursements.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {disbursements.map(db => {
              const g4 = db.has_journal === false && db.status === 'verified';
              return (
                <div key={db.disbursement_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: t.card, border: `1px solid ${t.cardBorder}`,
                }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(db.amount)}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {g4 && (
                      <span title="G4: pencairan verified tanpa jurnal" style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(239,68,68,0.15)', color: '#F87171',
                      }}>
                        G4
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: t.navHover, color: t.textDim,
                    }}>
                      {db.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-bits ─────────────────────────────────────────────────────

function AggStat({ label, value, color, t, highlight }: {
  label: string; value: number; color: string; t: AdminTheme; highlight?: boolean;
}) {
  return (
    <div style={{
      flex: '1 1 120px', minWidth: 110,
      padding: '8px 12px', borderRadius: 10,
      background: highlight ? `${color}14` : t.card,
      border: `1px solid ${highlight ? color : t.cardBorder}`,
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {formatRupiah(value)}
      </p>
    </div>
  );
}

function hCell(t: AdminTheme, align: 'left' | 'right'): React.CSSProperties {
  return {
    textAlign: align, padding: '8px 12px',
    fontSize: 9, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
  };
}

function bCell(t: AdminTheme, align: 'left' | 'right'): React.CSSProperties {
  return { textAlign: align, padding: '8px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' };
}
