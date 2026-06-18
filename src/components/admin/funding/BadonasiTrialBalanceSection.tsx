'use client';

// [BADONASI-TB-BUILD] Section Trial Balance AGREGAT BADONASI (audit/grant) di /cashflow.
// Fetch GET /funding/admin/cashflow/trial-balance → buku partner + badonasi (reuse
// TrialBalanceTable) + baris GRAND TOTAL Σ Db / Σ Cr + badge balance (ALARM merah kalau
// tidak balance — angka ke pihak luar). Export CSV buat lampiran grant.

import { useEffect, useState, useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import TrialBalanceTable, { type TrialBalanceSection } from '@/components/admin/funding/TrialBalanceTable';
import { formatRupiah } from '@/utils/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface TBRow { account_code: string; account_name: string; debit: number; credit: number }
interface TBBook { perspective: string; rows: TBRow[]; totals: { debit: number; credit: number; balanced: boolean } }
interface AggResp {
  books: TBBook[];
  grand_total: { debit: number; credit: number; balanced: boolean };
  reversed_count: number;
  generated_at: string;
}

function bookLabel(p: string): string {
  return p === 'partner' ? 'Buku Partner' : p === 'badonasi' ? 'Buku BADONASI' : p;
}

export default function BadonasiTrialBalanceSection() {
  const { t } = useContext(AdminThemeContext);
  const [data, setData] = useState<AggResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const tk = localStorage.getItem('tl_token');
      if (!tk) { setError('Sesi admin tidak ditemukan.'); setLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/funding/admin/cashflow/trial-balance`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success && json.data) setData(json.data);
        else setError(json?.error?.message || 'Gagal memuat trial balance.');
      } catch {
        if (!cancelled) setError('Koneksi bermasalah.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sections: TrialBalanceSection[] = (data?.books ?? []).map(b => ({
    label: bookLabel(b.perspective),
    rows: b.rows,
    total_debit: b.totals.debit,
    total_credit: b.totals.credit,
    balanced: b.totals.balanced,
  }));

  function exportCsv() {
    if (!data) return;
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const lines = ['Buku,Kode Akun,Nama Akun,Debit,Kredit'];
    for (const b of data.books) {
      for (const r of b.rows) {
        lines.push([bookLabel(b.perspective), r.account_code, esc(r.account_name), r.debit, r.credit].join(','));
      }
      lines.push([bookLabel(b.perspective), '', 'TOTAL', b.totals.debit, b.totals.credit].join(','));
    }
    lines.push(['GRAND TOTAL', '', '', data.grand_total.debit, data.grand_total.credit].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-badonasi-${data.generated_at.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const card: React.CSSProperties = {
    background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 20, marginBottom: 20,
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Trial Balance BADONASI
          </p>
          <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
            Agregat seluruh buku · Σ Debit = Σ Kredit (double-entry) · scope source_domain BADONASI
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data && (
            <span style={{ fontSize: 10, color: t.textDim }}>
              per {new Date(data.generated_at).toLocaleString('id-ID')}
              {data.reversed_count > 0 ? ` · ${data.reversed_count} reversed (tak dihitung)` : ''}
            </span>
          )}
          {data && sections.length > 0 && (
            <button onClick={exportCsv}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                background: t.navHover, color: t.textPrimary, border: `1px solid ${t.sidebarBorder}`,
              }}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: t.textDim }}>Memuat trial balance…</p>
      ) : error ? (
        <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px' }}>
          ⚠ {error}
        </div>
      ) : !data || sections.length === 0 ? (
        <p style={{ fontSize: 12, color: t.textDim }}>Belum ada jurnal posted.</p>
      ) : (
        <>
          <TrialBalanceTable sections={sections} t={t} />

          {/* GRAND TOTAL + alarm balance (integritas buku) */}
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '12px 16px', borderRadius: 12,
            background: data.grand_total.balanced ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${data.grand_total.balanced ? 'rgba(16,185,129,0.3)' : '#EF4444'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.textPrimary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Grand Total
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                background: data.grand_total.balanced ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.2)',
                color: data.grand_total.balanced ? '#34D399' : '#F87171',
              }}>
                {data.grand_total.balanced ? '✓ Balance' : '✗ TIDAK BALANCE — ALARM'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 18, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 12 }}><span style={{ color: t.textMuted }}>Σ Debit </span><strong style={{ color: t.textPrimary }}>{formatRupiah(data.grand_total.debit)}</strong></span>
              <span style={{ fontSize: 12 }}><span style={{ color: t.textMuted }}>Σ Kredit </span><strong style={{ color: t.textPrimary }}>{formatRupiah(data.grand_total.credit)}</strong></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
