'use client';

/**
 * TeraLoka — PtBalanceSheetSection (Neraca PT, skontro 2-kolom) — collapsible
 * Endpoint: GET /money/revenue/balance-sheet?perspective=pt
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Landmark, Inbox } from 'lucide-react';
import ReportCard from './ReportCard';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface BSRow { account_code: string; account_name: string; amount: number; }
interface BalanceSheet {
  perspective: string; as_of: string;
  assets: BSRow[]; liabilities: BSRow[]; equity: BSRow[];
  total_assets: number; total_liabilities: number; total_equity: number; balanced: boolean;
}
const formatRp = (n: number) => (n === 0 ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);
const BADGE = 'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full';

function AccountRow({ row }: { row: BSRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[14px] py-2.5 border-t border-border">
      <span className="text-[12px] text-text min-w-0">
        {row.account_code !== '—' && <span className="font-mono font-bold text-[11px] text-text-muted mr-2">{row.account_code}</span>}
        {row.account_name}
      </span>
      <span className="text-[12px] text-text tabular-nums shrink-0">{formatRp(row.amount)}</span>
    </div>
  );
}
function GroupHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">{children}</div>;
}
function SubtotalRow({ label, amount, color }: { label: string; amount: number; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[14px] py-2.5 border-t border-border">
      <span className="text-[12px] font-bold text-text-muted">{label}</span>
      <span className={cn('text-[12px] font-bold tabular-nums shrink-0', color ?? 'text-text-muted')}>{formatRp(amount)}</span>
    </div>
  );
}

export default function PtBalanceSheetSection() {
  const { token } = useAuth();
  const [data, setData]       = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/money/revenue/balance-sheet?perspective=pt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) { setError(json.error?.message ?? 'Gagal memuat Neraca'); setData(null); }
      else setData(json.data);
    } catch (e: any) { setError(e?.message ?? 'Network error'); setData(null); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasRows = !!data && (data.assets.length > 0 || data.liabilities.length > 0 || data.equity.length > 0);
  const totalPasiva = (data?.total_liabilities ?? 0) + (data?.total_equity ?? 0);

  return (
    <ReportCard
      icon={<Landmark className="w-4 h-4 text-ads" />}
      title="Neraca (Balance Sheet)"
      subtitle="Bentuk skontro · PT TeraLoka · Aktiva (Debet) = Pasiva (Kredit)"
      summary={!loading && hasRows ? (
        <>
          <span className="text-[13px] font-extrabold text-text tabular-nums">{formatRp(data!.total_assets)}</span>
          <span className={cn(BADGE, data!.balanced ? 'bg-status-healthy/12 text-status-healthy' : 'bg-status-critical/12 text-status-critical')}>{data!.balanced ? '✓ Seimbang' : '✕ Timpang'}</span>
        </>
      ) : null}
    >
      {loading && <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat neraca…</div>}
      {!loading && error && <div className="p-5 text-[12px] text-status-critical">{error}</div>}
      {!loading && data && !hasRows && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" /> Belum ada akun atau jurnal PT yang tercatat.
        </div>
      )}
      {!loading && hasRows && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="md:border-r border-border">
              <div className="px-[14px] py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted bg-surface-muted/40 border-b border-border flex justify-between">
                <span>Debet · Aktiva</span><span className="text-text-subtle font-semibold normal-case tracking-normal">Aset</span>
              </div>
              {data!.assets.map((r) => <AccountRow key={`a-${r.account_code}`} row={r} />)}
            </div>
            <div>
              <div className="px-[14px] py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted bg-surface-muted/40 border-b border-border flex justify-between">
                <span>Kredit · Pasiva</span><span className="text-text-subtle font-semibold normal-case tracking-normal">Kewajiban + Ekuitas</span>
              </div>
              <GroupHeader>Kewajiban</GroupHeader>
              {data!.liabilities.map((r) => <AccountRow key={`l-${r.account_code}`} row={r} />)}
              <SubtotalRow label="Total Kewajiban" amount={data!.total_liabilities} color="text-status-critical" />
              <GroupHeader>Ekuitas</GroupHeader>
              {data!.equity.map((r) => <AccountRow key={`e-${r.account_code}-${r.account_name}`} row={r} />)}
              <SubtotalRow label="Total Ekuitas" amount={data!.total_equity} color="text-status-healthy" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 border-t-2 border-ads bg-surface-muted/60">
            <div className="md:border-r border-border flex items-center justify-between gap-3 px-[14px] py-3">
              <span className="text-[13px] font-extrabold text-text">Total Aktiva</span>
              <span className="text-[14px] font-extrabold text-text tabular-nums shrink-0">{formatRp(data!.total_assets)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-[14px] py-3 border-t border-border md:border-t-0">
              <span className="text-[13px] font-extrabold text-text">Total Pasiva</span>
              <span className="text-[14px] font-extrabold text-text tabular-nums shrink-0">{formatRp(totalPasiva)}</span>
            </div>
          </div>
          <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
            Bentuk skontro: Aktiva (sisi Debet) di kiri, Pasiva = Kewajiban + Ekuitas (sisi Kredit) di kanan. Total Aktiva harus sama dengan Total Pasiva. Pendapatan &amp; Beban melebur jadi Laba Ditahan di Ekuitas. Posisi kumulatif (snapshot).
          </div>
        </>
      )}
    </ReportCard>
  );
}
