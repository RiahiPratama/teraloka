'use client';

/**
 * TeraLoka — YayasanCashFlowSection (Arus Kas Yayasan) — collapsible
 * Sesi Financial Yayasan (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * CASH BASIS dari setoran fee partner (funding.fee_remittances).
 * Kas Yayasan tidak gerak di ledger → sumber = fee_remittances (verified).
 * Berbeda dari Laporan Aktivitas (accrual 4201): selisih = Piutang Fee.
 * Endpoint: GET /money/revenue/cash-flow?perspective=yayasan&<periode>
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Inbox } from 'lucide-react';
import ReportCard from './ReportCard';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface CFLine { entry_type: string; label: string; amount: number; }
interface CashFlow {
  perspective: string; period: { from: string | null; to: string | null };
  operasi: CFLine[]; investasi: CFLine[]; pendanaan: CFLine[];
  total_operasi: number; total_investasi: number; total_pendanaan: number; net_cash_flow: number;
}
const formatRpSigned = (n: number) => { if (n === 0) return '—'; const s = n < 0 ? '−' : '+'; return `${s} Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`; };
const formatRp = (n: number) => (n === 0 ? 'Rp 0' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);
const BADGE = 'text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full';

interface Props { period: string; appliedFrom: string; appliedTo: string; periodLabel: string; }

export default function YayasanCashFlowSection({ period, appliedFrom, appliedTo, periodLabel }: Props) {
  const { token } = useAuth();
  const [data, setData]       = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    const periodQuery =
      period === 'custom' && appliedFrom && appliedTo
        ? `from=${encodeURIComponent(new Date(appliedFrom).toISOString())}&to=${encodeURIComponent(new Date(appliedTo + 'T23:59:59').toISOString())}`
        : `period=${period}`;
    try {
      const res = await fetch(`${API}/money/revenue/cash-flow?perspective=yayasan&${periodQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success || !json.data) { setError(json.error?.message ?? 'Gagal memuat Arus Kas'); setData(null); }
      else setData(json.data);
    } catch (e: any) { setError(e?.message ?? 'Network error'); setData(null); }
    finally { setLoading(false); }
  }, [token, period, appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasRows = !!data && (data.operasi.length > 0 || data.investasi.length > 0 || data.pendanaan.length > 0);
  const isPositive = (data?.net_cash_flow ?? 0) >= 0;

  const renderGroup = (title: string, rows: CFLine[], total: number) => (
    <>
      <tr><td colSpan={2} className="px-[14px] py-2 text-[10px] font-extrabold uppercase tracking-wider text-ads bg-surface-muted/60 border-t border-border">Aktivitas {title}</td></tr>
      {rows.length === 0 ? (
        <tr className="border-t border-border">
          <td className="px-[14px] py-2.5 text-left text-[12px] text-text-muted italic">Tidak ada arus kas</td>
          <td className="px-[14px] py-2.5 text-right text-[12px] text-text-muted tabular-nums">—</td>
        </tr>
      ) : rows.map((r) => (
        <tr key={`${title}-${r.entry_type}`} className="border-t border-border">
          <td className="px-[14px] py-2.5 text-left text-[12px] text-text">{r.label}</td>
          <td className={cn('px-[14px] py-2.5 text-right text-[12px] tabular-nums', r.amount < 0 ? 'text-status-critical' : 'text-status-healthy')}>{formatRpSigned(r.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-border">
        <td className="px-[14px] py-2.5 text-left text-[12px] font-bold text-text-muted">Kas Bersih dari {title}</td>
        <td className={cn('px-[14px] py-2.5 text-right text-[12px] font-bold tabular-nums', total < 0 ? 'text-status-critical' : 'text-text')}>{formatRpSigned(total)}</td>
      </tr>
    </>
  );

  return (
    <ReportCard
      icon={<ArrowLeftRight className="w-4 h-4 text-ads" />}
      title="Laporan Arus Kas"
      subtitle={`Cash basis · setoran fee partner · Yayasan TeraLoka · ${periodLabel}`}
      summary={!loading && hasRows ? (
        <>
          <span className={cn('text-[13px] font-extrabold tabular-nums', isPositive ? 'text-status-healthy' : 'text-status-critical')}>{formatRp(data!.net_cash_flow)}</span>
          <span className={cn(BADGE, isPositive ? 'bg-status-healthy/12 text-status-healthy' : 'bg-status-critical/12 text-status-critical')}>{isPositive ? 'Kas Naik' : 'Kas Turun'}</span>
        </>
      ) : null}
    >
      {loading && <div className="py-8 px-5 text-center text-[12px] text-text-muted">Memuat arus kas…</div>}
      {!loading && error && <div className="p-5 text-[12px] text-status-critical">{error}</div>}
      {!loading && data && !hasRows && (
        <div className="py-10 px-5 text-center text-[12px] text-text-muted">
          <Inbox className="w-7 h-7 mx-auto mb-2 text-text-muted" /> Belum ada setoran fee pada periode ini.
        </div>
      )}
      {!loading && hasRows && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {renderGroup('Operasi', data!.operasi, data!.total_operasi)}
              {renderGroup('Investasi', data!.investasi, data!.total_investasi)}
              {renderGroup('Pendanaan', data!.pendanaan, data!.total_pendanaan)}
              <tr className="border-t-2 border-ads bg-surface-muted/60">
                <td className="px-[14px] py-3 text-left text-[13px] font-extrabold text-text">{isPositive ? 'Kenaikan Kas Bersih' : 'Penurunan Kas Bersih'}</td>
                <td className={cn('px-[14px] py-3 text-right text-[14px] font-extrabold tabular-nums', isPositive ? 'text-status-healthy' : 'text-status-critical')}>{formatRp(data!.net_cash_flow)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {!loading && hasRows && (
        <div className="px-[14px] py-2.5 text-[10px] text-text-subtle border-t border-border leading-relaxed">
          Arus kas Yayasan = setoran fee partner yang sudah masuk (verified, cash nyata). Berbeda dari Laporan Aktivitas (accrual, fee diakui saat donasi verified) — selisihnya = Piutang Fee Partner yang belum disetor.
        </div>
      )}
    </ReportCard>
  );
}
