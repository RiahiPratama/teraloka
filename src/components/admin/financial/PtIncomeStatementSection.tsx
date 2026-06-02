'use client';

/**
 * TeraLoka — PtIncomeStatementSection (Laporan Laba Rugi PT) — TAILWIND
 * Sesi Financial PT (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Laba/Rugi accrual dari ledger: Pendapatan (4xxx) − Beban (6xxx).
 * Endpoint: GET /money/revenue/income-statement?perspective=pt&<periode>
 *
 * Beda dgn Neraca Saldo: Laba/Rugi = PER-PERIODE (kinerja), ikut filter
 * periode dashboard. Style & pola konsisten dgn PtTrialBalanceSection.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Scale, Inbox } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface ISRow {
  account_code: string;
  account_name: string;
  account_type: string;
  amount:       number;
}
interface IncomeStatement {
  perspective:    string;
  period:         { from: string | null; to: string | null };
  revenue:        ISRow[];
  expense:        ISRow[];
  total_revenue:  number;
  total_expense:  number;
  net_income:     number;
}

const formatRp = (n: number) =>
  n === 0 ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`;

interface Props {
  period:      string;
  appliedFrom: string;
  appliedTo:   string;
  periodLabel: string;
}

export default function PtIncomeStatementSection({ period, appliedFrom, appliedTo, periodLabel }: Props) {
  const { token } = useAuth();
  const [data, setData]       = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const periodQuery =
      period === 'custom' && appliedFrom && appliedTo
        ? `from=${encodeURIComponent(new Date(appliedFrom).toISOString())}&to=${encodeURIComponent(new Date(appliedTo + 'T23:59:59').toISOString())}`
        : `period=${period}`;
    try {
      const res = await fetch(`${API}/money/revenue/income-statement?perspective=pt&${periodQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat Laba/Rugi');
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
  }, [token, period, appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isProfit = (data?.net_income ?? 0) >= 0;
  const hasRows  = !!data && (data.revenue.length > 0 || data.expense.length > 0);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[18px] py-3.5 border-b border-border flex-wrap">
        <div>
          <p className="text-[14px] font-bold text-text flex items-center gap-1.5"><Scale className="w-4 h-4 text-ads" /> Laporan Laba/Rugi</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Accrual dari ledger · PT TeraLoka · {periodLabel}
          </p>
        </div>
        {!loading && data && hasRows && (
          <span className={cn(
            'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full',
            isProfit
              ? 'bg-status-healthy/12 text-status-healthy'
              : 'bg-status-critical/12 text-status-critical',
          )}>
            {isProfit ? 'Laba' : 'Rugi'}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat laba/rugi…</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-5 text-[12px] text-status-critical">{error}</div>
      )}

      {/* Empty */}
      {!loading && data && !hasRows && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" />
          Belum ada pendapatan atau beban pada periode ini.
        </div>
      )}

      {/* Table */}
      {!loading && data && hasRows && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {/* PENDAPATAN */}
              <tr>
                <td colSpan={2} className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">
                  Pendapatan
                </td>
              </tr>
              {data.revenue.map((r) => (
                <tr key={r.account_code} className="border-t border-border">
                  <td className="px-[14px] py-2.5 text-left text-[12px] text-text">
                    <span className="font-mono font-bold text-[11px] text-text-muted mr-2">{r.account_code}</span>{r.account_name}
                  </td>
                  <td className="px-[14px] py-2.5 text-right text-[12px] text-text tabular-nums">{formatRp(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">Total Pendapatan</td>
                <td className="px-[14px] py-2.5 text-right text-[12px] font-bold text-status-healthy tabular-nums">{formatRp(data.total_revenue)}</td>
              </tr>

              {/* BEBAN */}
              <tr>
                <td colSpan={2} className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">
                  Beban
                </td>
              </tr>
              {data.expense.map((r) => (
                <tr key={r.account_code} className="border-t border-border">
                  <td className="px-[14px] py-2.5 text-left text-[12px] text-text">
                    <span className="font-mono font-bold text-[11px] text-text-muted mr-2">{r.account_code}</span>{r.account_name}
                  </td>
                  <td className="px-[14px] py-2.5 text-right text-[12px] text-text tabular-nums">{formatRp(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">Total Beban</td>
                <td className="px-[14px] py-2.5 text-right text-[12px] font-bold text-status-critical tabular-nums">{formatRp(data.total_expense)}</td>
              </tr>

              {/* LABA/RUGI BERSIH */}
              <tr className="border-t-2 border-ads bg-surface-muted/60">
                <td className="px-[14px] py-3 text-left text-[13px] font-extrabold text-text">
                  {isProfit ? 'Laba Bersih' : 'Rugi Bersih'}
                </td>
                <td className={cn(
                  'px-[14px] py-3 text-right text-[14px] font-extrabold tabular-nums',
                  isProfit ? 'text-status-healthy' : 'text-status-critical',
                )}>
                  {formatRp(Math.abs(data.net_income))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer note */}
      {!loading && data && hasRows && (
        <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
          Laba/Rugi = Pendapatan − Beban (accrual, dari jurnal PT pada periode terpilih).
          Pendapatan iklan diakui straight-line (earned), bisa berbeda dari kas masuk. Basis laporan pajak PT.
        </div>
      )}
    </div>
  );
}
