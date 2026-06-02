'use client';

/**
 * TeraLoka — PtTrialBalanceSection (Neraca Saldo PT) — TAILWIND + collapsible
 * Endpoint: GET /money/revenue/trial-balance?perspective=pt
 */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { BookText, Inbox } from 'lucide-react';
import ReportCard from './ReportCard';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface TBRow {
  account_code: string; account_name: string; account_type: string;
  account_subtype: string | null; normal_balance: string;
  debit: number; credit: number; balance: number;
}
interface TrialBalance {
  perspective: string; as_of: string; rows: TBRow[];
  totals: { debit: number; credit: number; balanced: boolean };
}

const TYPE_LABEL: Record<string, string> = {
  asset: 'ASET', liability: 'KEWAJIBAN', equity: 'EKUITAS', revenue: 'PENDAPATAN', expense: 'BEBAN',
};
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const formatRp = (n: number) => (n === 0 ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);
const BADGE = 'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full';

export default function PtTrialBalanceSection() {
  const { token } = useAuth();
  const [data, setData]       = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/money/revenue/trial-balance?perspective=pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) { setError(json.error?.message ?? 'Gagal memuat Neraca Saldo'); setData(null); }
      else setData(json.data);
    } catch (e: any) { setError(e?.message ?? 'Network error'); setData(null); }
    finally { setLoading(false); }
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
  const hasRows = !!data && data.rows.length > 0;

  return (
    <ReportCard
      icon={<BookText className="w-4 h-4 text-ads" />}
      title="Neraca Saldo (Trial Balance)"
      subtitle="Dari ledger double-entry · PT TeraLoka · saldo kumulatif"
      summary={!loading && hasRows ? (
        <>
          <span className="text-[13px] font-extrabold text-text tabular-nums">{formatRp(sumDebitCol)}</span>
          <span className={cn(BADGE, balanced ? 'bg-status-healthy/12 text-status-healthy' : 'bg-status-critical/12 text-status-critical')}>
            {balanced ? '✓ Seimbang' : '✕ Timpang'}
          </span>
        </>
      ) : null}
    >
      {loading && <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat neraca saldo…</div>}
      {!loading && error && <div className="p-5 text-[12px] text-status-critical">{error}</div>}
      {!loading && data && data.rows.length === 0 && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" /> Belum ada akun PT atau jurnal yang tercatat.
        </div>
      )}
      {!loading && hasRows && (
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
                      <td colSpan={2} className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">Subtotal {TYPE_LABEL[g.type] ?? g.type}</td>
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
      {!loading && hasRows && (
        <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
          Total debit harus sama dengan total kredit (double-entry). Saldo per akun = debit − kredit dari seluruh jurnal PT. Basis laporan pajak PT.
        </div>
      )}
    </ReportCard>
  );
}
