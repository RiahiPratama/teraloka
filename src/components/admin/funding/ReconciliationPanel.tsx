'use client';

/**
 * TeraLoka — ReconciliationPanel (Aliran Uang)
 * Sesi Audit BADONASI (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Auditor otomatis: banding angka di Tabel Donasi vs Buku Besar (ledger).
 * Semua cocok → hijau (data terpercaya). Ada selisih → merah + angka
 * (deteksi bocor seperti Bug A). Backend=OTAK: semua hitung di endpoint
 * /funding/admin/cashflow/reconciliation; panel ini cuma WAJAH.
 */

import { useEffect, useState, useCallback, useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { ShieldCheck, ShieldAlert, RefreshCw, Check, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface ReconCheck {
  key: string;
  label: string;
  source_label_a: string;
  source_label_b: string;
  amount_a: number;
  amount_b: number;
  diff: number;
  match: boolean;
}
interface ReconData {
  checks: ReconCheck[];
  all_match: boolean;
  checked_at: string;
}

function rupiah(n: number): string { return 'Rp ' + (n ?? 0).toLocaleString('id-ID'); }

export default function ReconciliationPanel() {
  const { t } = useContext(AdminThemeContext);
  const [data, setData] = useState<ReconData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecon = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/cashflow/reconciliation`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setData(json.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecon(); }, [fetchRecon]);

  const allMatch = data?.all_match ?? true;
  const accent = allMatch ? '#10B981' : '#DC2626';

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${allMatch ? t.sidebarBorder : accent + '55'}`,
      borderRadius: 14, padding: 16, marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: data ? 12 : 0, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent + '18', color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {allMatch ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 1 }}>
              Rekonsiliasi Data
            </p>
            <p style={{ fontSize: 11, color: t.textDim }}>
              Cek-cocok Tabel Donasi vs Buku Besar
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 800, color: accent,
              background: accent + '14', padding: '5px 12px', borderRadius: 999,
            }}>
              {allMatch ? <Check size={14} /> : <X size={14} />}
              {allMatch ? 'Semua Cocok' : 'Ada Selisih'}
            </span>
          )}
          <button
            onClick={fetchRecon}
            disabled={loading}
            title="Cek ulang"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid ${t.sidebarBorder}`, background: t.navHover,
              color: t.textDim, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Rows */}
      {loading && !data ? (
        <p style={{ fontSize: 12, color: t.textDim, padding: '4px 0' }}>Memeriksa konsistensi data...</p>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.checks.map(chk => {
            const c = chk.match ? '#10B981' : '#DC2626';
            return (
              <div key={chk.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap',
                background: chk.match ? 'transparent' : c + '0C',
                border: `1px solid ${chk.match ? t.sidebarBorder : c + '40'}`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                    background: c, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {chk.match ? <Check size={12} /> : <X size={12} />}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{chk.label}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: t.textDim }}>
                    {chk.source_label_a}: <strong style={{ color: t.textPrimary }}>{rupiah(chk.amount_a)}</strong>
                  </span>
                  <span style={{ color: t.textMuted }}>{chk.match ? '=' : '≠'}</span>
                  <span style={{ color: t.textDim }}>
                    {chk.source_label_b}: <strong style={{ color: t.textPrimary }}>{rupiah(chk.amount_b)}</strong>
                  </span>
                  {!chk.match && (
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: '#fff', background: c,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      selisih {rupiah(Math.abs(chk.diff))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {!allMatch && (
            <p style={{ fontSize: 11, color: '#DC2626', marginTop: 2, fontWeight: 600 }}>
              ⚠ Ada selisih antara data donasi dan buku besar — periksa kemungkinan transaksi yang belum tercatat di ledger.
            </p>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: t.textDim }}>Gagal memuat data rekonsiliasi.</p>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
