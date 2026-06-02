'use client';

/**
 * TeraLoka — PtBalanceSheetSection (Neraca / Balance Sheet PT) — TAILWIND
 * Sesi Financial PT (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Posisi keuangan: Aset = Kewajiban + Ekuitas. Snapshot kumulatif.
 * Pendapatan & Beban melebur jadi "Laba Ditahan" di sisi Ekuitas.
 * Endpoint: GET /money/revenue/balance-sheet?perspective=pt
 *
 * Snapshot (bukan per-periode) — sama seperti Neraca Saldo, NOL prop periode.
 * Style & pola konsisten dgn PtTrialBalanceSection.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Landmark, Inbox } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface BSRow {
  account_code: string;
  account_name: string;
  amount:       number;
}
interface BalanceSheet {
  perspective:        string;
  as_of:              string;
  assets:             BSRow[];
  liabilities:        BSRow[];
  equity:             BSRow[];
  total_assets:       number;
  total_liabilities:  number;
  total_equity:       number;
  balanced:           boolean;
}

const formatRp = (n: number) =>
  n === 0 ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export default function PtBalanceSheetSection() {
  const { token } = useAuth();
  const [data, setData]       = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/money/revenue/balance-sheet?perspective=pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat Neraca');
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

  const hasRows = !!data && (data.assets.length > 0 || data.liabilities.length > 0 || data.equity.length > 0);

  const renderGroup = (title: string, rows: BSRow[], total: number, totalColor: string) => (
    <>
      <tr>
        <td colSpan={2} className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">
          {title}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={`${title}-${r.account_code}-${r.account_name}`} className="border-t border-border">
          <td className="px-[14px] py-2.5 text-left text-[12px] text-text">
            {r.account_code !== '—' && (
              <span className="font-mono font-bold text-[11px] text-text-muted mr-2">{r.account_code}</span>
            )}
            {r.account_name}
          </td>
          <td className="px-[14px] py-2.5 text-right text-[12px] text-text tabular-nums">{formatRp(r.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-border">
        <td className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">Total {title}</td>
        <td className={cn('px-[14px] py-2.5 text-right text-[12px] font-bold tabular-nums', totalColor)}>{formatRp(total)}</td>
      </tr>
    </>
  );

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[18px] py-3.5 border-b border-border flex-wrap">
        <div>
          <p className="text-[14px] font-bold text-text flex items-center gap-1.5"><Landmark className="w-4 h-4 text-ads" /> Neraca (Balance Sheet)</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Posisi keuangan · PT TeraLoka · Aset = Kewajiban + Ekuitas
          </p>
        </div>
        {!loading && data && hasRows && (
          <span className={cn(
            'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full',
            data.balanced
              ? 'bg-status-healthy/12 text-status-healthy'
              : 'bg-status-critical/12 text-status-critical',
          )}>
            {data.balanced ? '✓ Seimbang' : '✕ Tidak seimbang'}
          </span>
        )}
      </div>

      {loading && (
        <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat neraca…</div>
      )}
      {!loading && error && (
        <div className="p-5 text-[12px] text-status-critical">{error}</div>
      )}
      {!loading && data && !hasRows && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" />
          Belum ada akun atau jurnal PT yang tercatat.
        </div>
      )}

      {!loading && data && hasRows && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {renderGroup('Aset', data.assets, data.total_assets, 'text-text')}
              {renderGroup('Kewajiban', data.liabilities, data.total_liabilities, 'text-status-critical')}
              {renderGroup('Ekuitas', data.equity, data.total_equity, 'text-status-healthy')}

              {/* GRAND: Kewajiban + Ekuitas vs Aset */}
              <tr className="border-t-2 border-ads bg-surface-muted/60">
                <td className="px-[14px] py-3 text-left text-[13px] font-extrabold text-text">Kewajiban + Ekuitas</td>
                <td className="px-[14px] py-3 text-right text-[14px] font-extrabold text-text tabular-nums">
                  {formatRp(data.total_liabilities + data.total_equity)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && hasRows && (
        <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
          Total Aset harus sama dengan Total Kewajiban + Ekuitas. Pendapatan & Beban
          tidak tampil terpisah — melebur jadi Laba Ditahan di Ekuitas. Posisi kumulatif (snapshot).
        </div>
      )}
    </div>
  );
}
