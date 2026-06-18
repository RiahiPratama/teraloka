'use client';

// [FORENSIK-TABEL-FE] Drill-down forensik "Total Masuk (GROSS)" — tabel per-transaksi.
// FE DISPLAY ONLY: semua angka & komponen dari backend GET /funding/admin/cashflow/transaksi-breakdown.
// Jangan recompute di FE. Pola container/header/CSV mirror CashflowDetailPanel.

import { useContext, useEffect, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const ACCENT = '#6366F1'; // sama warna kartu "Total Masuk (GROSS)"

interface TxRow {
  no_transaksi: string;
  tgl_transfer: string | null;
  tgl_verifikasi: string | null;
  tercatat: number;
  beneficiary: number;
  fee: number;
  tip: number;
  kode_unik: number;
  status: 'verified' | 'partial' | 'excess' | 'under_audit' | string;
  balanced: boolean;
}

interface TxBreakdown {
  rows: TxRow[];
  total_tercatat_ledger: number;
  total_termasuk_audit: number;
  count: number;
}

function rupiah(n: number): string {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  verified:    { label: 'verified', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  partial:     { label: 'partial',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  excess:      { label: 'excess',   color: '#EC4899', bg: 'rgba(236,72,153,0.15)' },
  under_audit: { label: 'audit',    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
};

// [CASHFLOW-FE-FINAL] total verified per-kolom dari summary backend (jangan recompute di FE).
interface VerifiedTotals {
  total_in: number;
  total_beneficiary: number;
  total_fee: number;
  total_tip: number;
  total_kode_unik: number;
}

export default function TransaksiBreakdownPanel({
  onClose,
  dateFrom,
  dateTo,
  periodLabel,
  verifiedTotals,
}: {
  onClose: () => void;
  dateFrom: string | null;
  dateTo: string | null;
  periodLabel?: string;
  verifiedTotals?: VerifiedTotals;
}) {
  const { t } = useContext(AdminThemeContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TxBreakdown | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      const tk = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
      if (!tk) { setError('Sesi admin tidak ditemukan.'); setLoading(false); return; }
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString();
      try {
        const res = await fetch(`${API_URL}/funding/admin/cashflow/transaksi-breakdown${qs ? '?' + qs : ''}`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success && json.data) setData(json.data);
        else setError(json?.error?.message || 'Gagal memuat rincian transaksi.');
      } catch {
        if (!cancelled) setError('Koneksi bermasalah.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  function exportCsv() {
    if (!data) return;
    const esc = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const head = ['No. Transaksi', 'Tgl Transfer', 'Tgl Verifikasi', 'Tercatat (Masuk)', 'Hak Beneficiary', 'Fee TeraLoka', 'Tip Penggalang', 'Kode Unik', 'Status', 'Balanced'];
    const lines = [head.join(',')];
    for (const r of data.rows) {
      lines.push([
        esc(r.no_transaksi), esc(fmtDate(r.tgl_transfer)), esc(fmtDate(r.tgl_verifikasi)),
        r.tercatat, r.beneficiary, r.fee, r.tip, r.kode_unik, esc(r.status), r.balanced ? 'true' : 'false',
      ].join(','));
    }
    lines.push(['', '', 'TERCATAT (ledger)', data.total_tercatat_ledger, '', '', '', '', '', ''].join(','));
    lines.push(['', '', 'TERMASUK AUDIT', data.total_termasuk_audit, '', '', '', '', '', ''].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-masuk-forensik${periodLabel ? '-' + periodLabel.replace(/\s+/g, '_') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const th = (align: 'left' | 'right' | 'center'): React.CSSProperties => ({
    textAlign: align, padding: '8px 10px', fontSize: 9, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${t.sidebarBorder}`, position: 'sticky', top: 0, background: t.mainBg,
  });
  const td = (align: 'left' | 'right' | 'center'): React.CSSProperties => ({
    textAlign: align, padding: '8px 10px', fontSize: 11.5, whiteSpace: 'nowrap', verticalAlign: 'middle',
  });

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderLeft: `3px solid ${ACCENT}`,
      borderRadius: 12, padding: 16, marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            Total Masuk — Forensik per Transaksi
          </p>
          <p style={{ fontSize: 12, color: t.textDim }}>
            {data ? `${data.count} transaksi` : '…'}{periodLabel ? ` · ${periodLabel}` : ''} · FE display (angka dari ledger backend)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={exportCsv} disabled={loading || !data}
            style={{
              padding: '6px 12px', borderRadius: 6, background: ACCENT, color: '#fff',
              fontSize: 11, fontWeight: 700, border: 'none', cursor: loading || !data ? 'not-allowed' : 'pointer',
              opacity: loading || !data ? 0.5 : 1,
            }}>
            Export CSV
          </button>
          <button onClick={onClose}
            style={{ padding: '4px 10px', borderRadius: 6, background: t.navHover, color: t.textPrimary, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            ✕ Tutup
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8, color: t.textDim, fontSize: 12 }}>
          Memuat rincian transaksi…
        </div>
      )}
      {!loading && error && (
        <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div style={{ overflowX: 'auto', maxHeight: 520, border: `1px solid ${t.sidebarBorder}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th('left')}>No. Transaksi</th>
                  <th style={th('left')}>Tgl Transfer</th>
                  <th style={th('left')}>Tgl Verifikasi</th>
                  <th style={th('right')}>Tercatat (Masuk)</th>
                  <th style={th('right')}>Hak Beneficiary</th>
                  <th style={th('right')}>Fee TeraLoka</th>
                  <th style={th('right')}>Tip Penggalang</th>
                  <th style={th('right')}>Kode Unik</th>
                  <th style={th('center')}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td('center'), color: t.textDim, padding: 24 }}>Tidak ada transaksi pada periode ini.</td></tr>
                ) : data.rows.map((r, i) => {
                  const meta = STATUS_META[r.status] ?? { label: r.status, color: t.textDim, bg: t.navHover };
                  const isPartial = r.status === 'partial';
                  const isExcess = r.status === 'excess';
                  const isAudit = r.status === 'under_audit';
                  // partial → fee/tip/kode redup (semua ke beneficiary)
                  const dimColor = isPartial ? t.textDim : t.textPrimary;
                  // excess → kode unik highlight pink bold
                  const kodeStyle: React.CSSProperties = isExcess
                    ? { color: '#EC4899', fontWeight: 800 }
                    : { color: isPartial ? t.textDim : t.textPrimary };
                  return (
                    <tr key={r.no_transaksi + i} style={{
                      borderBottom: i === data.rows.length - 1 ? 'none' : `1px solid ${t.sidebarBorder}`,
                      borderLeft: isAudit ? '3px solid #3B82F6' : '3px solid transparent',
                      background: isAudit ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}>
                      <td style={{ ...td('left'), fontFamily: 'monospace', color: t.textPrimary }}>
                        {r.no_transaksi}
                        {!r.balanced && (
                          <span title="Tidak balance (Db≠Cr)" style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#DC2626', background: 'rgba(220,38,38,0.12)', padding: '1px 5px', borderRadius: 4 }}>⚠ tak balance</span>
                        )}
                      </td>
                      <td style={{ ...td('left'), color: t.textDim }}>{fmtDate(r.tgl_transfer)}</td>
                      <td style={{ ...td('left'), color: t.textDim }}>{fmtDate(r.tgl_verifikasi)}</td>
                      <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', color: t.textPrimary, fontWeight: 700 }}>{rupiah(r.tercatat)}</td>
                      <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', color: t.textPrimary }}>{rupiah(r.beneficiary)}</td>
                      <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', color: dimColor }}>{rupiah(r.fee)}</td>
                      <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', color: dimColor }}>{rupiah(r.tip)}</td>
                      <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', ...kodeStyle }}>{rupiah(r.kode_unik)}</td>
                      <td style={td('center')}>
                        <span style={{
                          display: 'inline-block', background: meta.bg, color: meta.color,
                          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {verifiedTotals && data.rows.length > 0 && (
                <tfoot>
                  <tr style={{
                    borderTop: `2px solid ${t.sidebarBorder}`,
                    background: t.navHover,
                    position: 'sticky', bottom: 0,
                  }}>
                    <td style={{ ...td('left'), fontWeight: 800, color: t.textPrimary }}>TOTAL (verified)</td>
                    <td style={{ ...td('left'), color: t.textDim }}>—</td>
                    <td style={{ ...td('left'), color: t.textDim }}>—</td>
                    <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: t.textPrimary }}>{rupiah(verifiedTotals.total_in)}</td>
                    <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: t.textPrimary }}>{rupiah(verifiedTotals.total_beneficiary)}</td>
                    <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: t.textPrimary }}>{rupiah(verifiedTotals.total_fee)}</td>
                    <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: t.textPrimary }}>{rupiah(verifiedTotals.total_tip)}</td>
                    <td style={{ ...td('right'), fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: t.textPrimary }}>{rupiah(verifiedTotals.total_kode_unik)}</td>
                    <td style={{ ...td('center'), color: t.textDim }}>—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer: 2 total dari backend (jangan hitung ulang) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
            <div style={{ flex: '1 1 240px', padding: '10px 14px', borderRadius: 10, background: t.navHover, border: `1px solid ${t.sidebarBorder}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Tercatat (masuk ledger)
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {rupiah(data.total_tercatat_ledger)}
              </p>
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>Pasti masuk buku besar (posted).</p>
            </div>
            <div style={{ flex: '1 1 240px', padding: '10px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Termasuk proses audit
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {rupiah(data.total_termasuk_audit)}
              </p>
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>Termasuk under_audit (belum masuk ledger).</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
