'use client';

/**
 * TeraLoka — PtTrialBalanceSection (Neraca Saldo PT) — TAILWIND
 * Sesi Financial PT (1 Jun 2026) · migrasi Tailwind
 * ────────────────────────────────────────────────────────────────
 * Laporan akuntansi di tab PT TeraLoka. Baca LEDGER double-entry → tax-ready.
 * Endpoint: GET /money/revenue/trial-balance?perspective=pt
 *
 * Style: Tailwind token (bg-surface / border-border / text-text / bg-ads),
 * theme-aware otomatis (light/dark) — konsisten dgn AdsFinancialPanel.
 * Self-contained: fetch sendiri (useAuth), NOL prop.
 */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface TBRow {
  account_code:    string;
  account_name:    string;
  account_type:    string;
  account_subtype: string | null;
  normal_balance:  string;
  debit:           number;
  credit:          number;
  balance:         number;
}
interface TrialBalance {
  perspective: string;
  as_of:       string;
  rows:        TBRow[];
  totals:      { debit: number; credit: number; balanced: boolean };
}

const TYPE_LABEL: Record<string, string> = {
  asset:     'ASET',
  liability: 'KEWAJIBAN',
  equity:    'EKUITAS',
  revenue:   'PENDAPATAN',
  expense:   'BEBAN',
};
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const formatRp = (n: number) =>
  n === 0 ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export default function PtTrialBalanceSection() {
  const { token } = useAuth();
  const [data, setData]       = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/money/revenue/trial-balance?perspective=pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat Neraca Saldo');
        setData(null);
      } else {
        setData(json.data);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colDebit  = (r: TBRow) => (r.balance > 0 ? r.balance : 0);
  const colCredit = (r: TBRow) => (r.balance < 0 ? -r.balance : 0);

  const grouped = TYPE_ORDER
    .map((type) => ({ type, rows: (data?.rows ?? []).filter((r) => r.account_type === type) }))
    .filter((g) => g.rows.length > 0);

  const sumDebitCol  = (data?.rows ?? []).reduce((x, r) => x + colDebit(r), 0);
  const sumCreditCol = (data?.rows ?? []).reduce((x, r) => x + colCredit(r), 0);
  const balanced     = Math.abs(sumDebitCol - sumCreditCol) < 0.01;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[18px] py-3.5 border-b border-border flex-wrap">
        <div>
          <p className="text-[14px] font-bold text-text">📒 Neraca Saldo (Trial Balance)</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Dari ledger double-entry · PT TeraLoka · saldo kumulatif
          </p>
        </div>
        {!loading && data && (
          <span className={cn(
            'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full',
            balanced
              ? 'bg-status-healthy/12 text-status-healthy'
              : 'bg-status-critical/12 text-status-critical',
          )}>
            {balanced ? '✓ Seimbang' : '✕ Tidak seimbang'}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat neraca saldo…</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-5 text-[12px] text-status-critical">{error}</div>
      )}

      {/* Empty */}
      {!loading && data && data.rows.length === 0 && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <div className="text-[30px] mb-2">📭</div>
          Belum ada akun PT atau jurnal yang tercatat.
        </div>
      )}

      {/* Table */}
      {!loading && data && data.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-muted/40">
                <th className="px-[14px] py-2 text-left text-[9px] font-bold uppercase tracking-wider text-text-muted">Kode</th>
                <th className="px-[14px] py-2 text-left text-[9px] font-bold uppercase tracking-wider text-text-muted">Akun</th>
                <th className="px-[14px] py-2 text-right text-[9px] font-bold uppercase tracking-wider text-text-muted">Debit</th>
                <th className="px-[14px] py-2 text-right text-[9px] font-bold uppercase tracking-wider text-text-muted">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const gDebit  = g.rows.reduce((x, r) => x + colDebit(r), 0);
                const gCredit = g.rows.reduce((x, r) => x + colCredit(r), 0);
                return (
                  <Fragment key={g.type}>
                    <tr>
                      <td colSpan={4} className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">
                        {TYPE_LABEL[g.type] ?? g.type.toUpperCase()}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.account_code} className="border-t border-border">
                        <td className="px-[14px] py-2.5 text-left text-[11px] font-mono font-bold text-text tabular-nums">{r.account_code}</td>
                        <td className="px-[14px] py-2.5 text-left text-[12px] text-text">{r.account_name}</td>
                        <td className="px-[14px] py-2.5 text-right text-[12px] text-text tabular-nums">{formatRp(colDebit(r))}</td>
                        <td className="px-[14px] py-2.5 text-right text-[12px] text-text tabular-nums">{formatRp(colCredit(r))}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border">
                      <td colSpan={2} className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">
                        Subtotal {TYPE_LABEL[g.type] ?? g.type}
                      </td>
                      <td className="px-[14px] py-2.5 text-right text-[12px] font-bold text-text-muted tabular-nums">{formatRp(gDebit)}</td>
                      <td className="px-[14px] py-2.5 text-right text-[12px] font-bold text-text-muted tabular-nums">{formatRp(gCredit)}</td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="border-t-2 border-ads bg-surface-muted/60">
                <td colSpan={2} className="px-[14px] py-2.5 text-left text-[12px] font-extrabold text-text">TOTAL</td>
                <td className="px-[14px] py-2.5 text-right text-[12px] font-extrabold text-text tabular-nums">{formatRp(sumDebitCol)}</td>
                <td className="px-[14px] py-2.5 text-right text-[12px] font-extrabold text-text tabular-nums">{formatRp(sumCreditCol)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer note */}
      {!loading && data && data.rows.length > 0 && (
        <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
          Total debit harus sama dengan total kredit (double-entry). Saldo per akun
          = debit − kredit dari seluruh jurnal PT. Basis laporan pajak PT.
        </div>
      )}
    </div>
  );
}
