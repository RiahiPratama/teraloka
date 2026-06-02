'use client';

/**
 * TeraLoka — YayasanBalanceSheetSection (Laporan Posisi Keuangan) — ISAK 35
 * Sesi Financial Yayasan (2 Jun 2026) · skontro 2-kolom · collapsible
 * ────────────────────────────────────────────────────────────────
 * Entitas NONLABA (ISAK 35): Aset = Liabilitas + ASET NETO (bukan Ekuitas).
 * Surplus melebur jadi Aset Neto. Snapshot kumulatif (accrual ledger).
 * Endpoint: GET /money/revenue/balance-sheet?perspective=yayasan
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { exportSingleReport } from '@/lib/financial/exportAccountantPackage';
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

// Label akun ekuitas PT → istilah ISAK 35 (Aset Neto) untuk Yayasan
const NETO_LABEL: Record<string, string> = {
  '3302': 'Surplus Tahun Berjalan',
  '3301': 'Surplus Terakumulasi',
  '—':    'Surplus Aktivitas',
};
const netoName = (r: BSRow) => NETO_LABEL[r.account_code] ?? r.account_name;

function AccountRow({ code, name, amount }: { code: string; name: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[14px] py-2.5 border-t border-border">
      <span className="text-[12px] text-text min-w-0">
        {code !== '—' && <span className="font-mono font-bold text-[11px] text-text-muted mr-2">{code}</span>}{name}
      </span>
      <span className="text-[12px] text-text tabular-nums shrink-0">{formatRp(amount)}</span>
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

export default function YayasanBalanceSheetSection() {
  const { token } = useAuth();
  const [data, setData]       = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/money/revenue/balance-sheet?perspective=yayasan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) { setError(json.error?.message ?? 'Gagal memuat Posisi Keuangan'); setData(null); }
      else setData(json.data);
    } catch (e: any) { setError(e?.message ?? 'Network error'); setData(null); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasRows = !!data && (data.assets.length > 0 || data.liabilities.length > 0 || data.equity.length > 0);
  const totalPasiva = (data?.total_liabilities ?? 0) + (data?.total_equity ?? 0);

  return (
    <ReportCard
      onDownload={(fmt) => exportSingleReport({ token: token!, reportType: 'balance-sheet', perspective: 'yayasan', format: fmt, period: 'all', appliedFrom: '', appliedTo: '', periodLabel: 'Kumulatif' })}
      icon={<Landmark className="w-4 h-4 text-ads" />}
      title="Laporan Posisi Keuangan"
      subtitle="Nonlaba ISAK 35 · Yayasan TeraLoka · Aset = Liabilitas + Aset Neto"
      summary={!loading && hasRows ? (
        <>
          <span className="text-[13px] font-extrabold text-text tabular-nums">{formatRp(data!.total_assets)}</span>
          <span className={cn(BADGE, data!.balanced ? 'bg-status-healthy/12 text-status-healthy' : 'bg-status-critical/12 text-status-critical')}>{data!.balanced ? '✓ Seimbang' : '✕ Timpang'}</span>
        </>
      ) : null}
    >
      {loading && <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat posisi keuangan…</div>}
      {!loading && error && <div className="p-5 text-[12px] text-status-critical">{error}</div>}
      {!loading && data && !hasRows && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" /> Belum ada akun atau jurnal Yayasan yang tercatat.
        </div>
      )}
      {!loading && hasRows && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* ASET */}
            <div className="md:border-r border-border">
              <div className="px-[14px] py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted bg-surface-muted/40 border-b border-border flex justify-between">
                <span>Debet · Aktiva</span><span className="text-text-subtle font-semibold normal-case tracking-normal">Aset</span>
              </div>
              {data!.assets.map((r) => <AccountRow key={`a-${r.account_code}`} code={r.account_code} name={r.account_code === '1102' ? `${r.account_name} (rek. owner — pra-formasi)` : r.account_name} amount={r.amount} />)}
            </div>
            {/* LIABILITAS + ASET NETO */}
            <div>
              <div className="px-[14px] py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted bg-surface-muted/40 border-b border-border flex justify-between">
                <span>Kredit · Pasiva</span><span className="text-text-subtle font-semibold normal-case tracking-normal">Liabilitas + Aset Neto</span>
              </div>
              <GroupHeader>Liabilitas</GroupHeader>
              {data!.liabilities.length === 0 ? (
                <div className="flex items-center justify-between gap-3 px-[14px] py-2.5 border-t border-border">
                  <span className="text-[12px] text-text-muted italic">Tidak ada liabilitas</span>
                  <span className="text-[12px] text-text-muted tabular-nums">—</span>
                </div>
              ) : data!.liabilities.map((r) => <AccountRow key={`l-${r.account_code}`} code={r.account_code} name={r.account_name} amount={r.amount} />)}
              <SubtotalRow label="Total Liabilitas" amount={data!.total_liabilities} color="text-status-critical" />

              <GroupHeader>Aset Neto</GroupHeader>
              {data!.equity.map((r) => <AccountRow key={`e-${r.account_code}-${r.account_name}`} code={r.account_code} name={netoName(r)} amount={r.amount} />)}
              <SubtotalRow label="Total Aset Neto" amount={data!.total_equity} color="text-status-healthy" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 border-t-2 border-ads bg-surface-muted/60">
            <div className="md:border-r border-border flex items-center justify-between gap-3 px-[14px] py-3">
              <span className="text-[13px] font-extrabold text-text">Total Aset</span>
              <span className="text-[14px] font-extrabold text-text tabular-nums shrink-0">{formatRp(data!.total_assets)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-[14px] py-3 border-t border-border md:border-t-0">
              <span className="text-[13px] font-extrabold text-text">Liabilitas + Aset Neto</span>
              <span className="text-[14px] font-extrabold text-text tabular-nums shrink-0">{formatRp(totalPasiva)}</span>
            </div>
          </div>
          <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
            ISAK 35 (nonlaba): Aset = Liabilitas + Aset Neto. Surplus aktivitas melebur jadi Aset Neto. Catatan pra-formasi: Yayasan belum berbadan hukum — saldo Kas saat ini fisik berada di rekening pribadi owner, di-earmark untuk misi Yayasan, dan akan dimigrasikan ke rekening Yayasan saat formasi (Q4 2026/Q1 2027). Posisi kumulatif (snapshot, accrual).
          </div>
        </>
      )}
    </ReportCard>
  );
}
