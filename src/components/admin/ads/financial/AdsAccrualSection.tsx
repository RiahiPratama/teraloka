'use client';

/**
 * TeraLoka — AdsAccrualSection
 * Sesi ADS Financial (1 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Section ACCRUAL di dalam tab "Financial ADS" (/admin/ads).
 * Komponen anak self-contained — fetch sendiri, NOL ketergantungan ke
 * state parent kecuali `token`. Section cash di AdsFinancialPanel TIDAK
 * kesentuh.
 *
 * Beda dari section cash:
 *   - Cash (parent)  = uang yang udah MASUK (financial_events)
 *   - Accrual (ini)  = berapa yang udah jadi PENDAPATAN vs masih diterima dimuka
 *     (straight-line per periode tayang) — buat laporan PT / pajak.
 *
 * Endpoint: GET /money/revenue/ads/recognition?as_of=YYYY-MM-DD
 *
 * Read-only. Period-close (tutup buku) dijalanin via skrip/endpoint terpisah.
 *
 * Design: mirror token AdsFinancialPanel (bg-surface, status-*, bg-ads, dll).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Layers, TrendingUp, Wallet, Clock, CalendarDays,
  Loader2, AlertTriangle, CheckCircle2, Hourglass, CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types (mirror backend ads-recognition.ts) ───────────────────

type RecognitionStatus = 'not_started' | 'in_progress' | 'fully_earned';

interface RecognitionRow {
  ad_id:         string;
  ad_display_id: string;
  amount:        number;
  earned:        number;
  unearned:      number;
  daily_rate:    number;
  days_total:    number;
  days_elapsed:  number;
  status:        RecognitionStatus;
  skipped:       boolean;
}

interface RecognitionSummary {
  as_of:          string;
  total_amount:   number;
  total_earned:   number;
  total_unearned: number;
  rows:           RecognitionRow[];
}

interface RecognitionResponse {
  success: boolean;
  data?:   RecognitionSummary;
  error?:  { code: string; message: string };
}

interface AdsAccrualSectionProps {
  token: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_META: Record<RecognitionStatus, {
  label: string; cls: string; Icon: typeof CheckCircle2;
}> = {
  fully_earned: { label: 'Selesai',     cls: 'bg-status-healthy/12 text-status-healthy', Icon: CheckCircle2 },
  in_progress:  { label: 'Berjalan',    cls: 'bg-status-info/12 text-status-info',       Icon: CircleDot },
  not_started:  { label: 'Belum mulai', cls: 'bg-status-warning/12 text-status-warning', Icon: Hourglass },
};

// ─── Component ───────────────────────────────────────────────────

export default function AdsAccrualSection({ token }: AdsAccrualSectionProps) {
  const [asOf, setAsOf]       = useState<string>(todayISO());
  const [data, setData]       = useState<RecognitionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'earned' | 'unearned'>('all');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/money/revenue/ads/recognition?as_of=${asOf}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json: RecognitionResponse = await res.json();
      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat data accrual');
        setData(null);
      } else {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, asOf]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const earnedPct = data && data.total_amount > 0
    ? Math.round((data.total_earned / data.total_amount) * 100)
    : 0;

  // Filter tabel sesuai kartu yang diklik
  const displayRows = (data?.rows ?? []).filter((r) =>
    filter === 'earned'   ? r.earned > 0 :
    filter === 'unearned' ? r.unearned > 0 :
    true,
  );

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ads/12 text-ads">
            <Layers size={14} />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
              Pengakuan Pendapatan (Accrual)
            </h3>
            <p className="text-[10px] text-text-muted">
              Earned vs diterima dimuka — basis laporan PT &amp; pajak
            </p>
          </div>
        </div>
        {/* as_of date picker */}
        <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border">
          <CalendarDays size={12} className="text-text-muted" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Per tanggal</span>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="bg-transparent text-[11px] font-semibold text-text outline-none"
          />
        </label>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 m-4 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
          <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-critical">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat accrual...</span>
        </div>
      )}

      {/* ─── Content ─── */}
      {!loading && data && (
        <>
          {/* 3 Cards (klik = filter tabel) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
            {/* Total kas masuk → semua baris */}
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'text-left border rounded-lg p-3 transition-all',
                filter === 'all'
                  ? 'bg-surface-muted border-text-muted/40 ring-1 ring-text-muted/30'
                  : 'bg-surface-muted/40 border-border hover:border-text-muted/30',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Wallet size={13} className="text-text-muted" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Total Kas Masuk</span>
                </div>
                {filter === 'all' && <span className="text-[8px] font-bold uppercase text-text-muted">aktif</span>}
              </div>
              <div className="text-[16px] font-extrabold text-text tabular-nums">{formatRp(data.total_amount)}</div>
              <p className="text-[9px] text-text-subtle mt-0.5">Semua iklan ({data.rows.length})</p>
            </button>
            {/* Sudah diakui → baris earned > 0 */}
            <button
              type="button"
              onClick={() => setFilter('earned')}
              className={cn(
                'text-left border rounded-lg p-3 transition-all',
                filter === 'earned'
                  ? 'bg-status-healthy/12 border-status-healthy/50 ring-1 ring-status-healthy/40'
                  : 'bg-status-healthy/8 border-status-healthy/25 hover:border-status-healthy/40',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-status-healthy" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-status-healthy">Sudah Diakui</span>
                </div>
                {filter === 'earned' && <span className="text-[8px] font-bold uppercase text-status-healthy">aktif</span>}
              </div>
              <div className="text-[16px] font-extrabold text-status-healthy tabular-nums">{formatRp(data.total_earned)}</div>
              <p className="text-[9px] text-text-subtle mt-0.5">Pendapatan Iklan (4301)</p>
            </button>
            {/* Diterima dimuka → baris unearned > 0 */}
            <button
              type="button"
              onClick={() => setFilter('unearned')}
              className={cn(
                'text-left border rounded-lg p-3 transition-all',
                filter === 'unearned'
                  ? 'bg-status-warning/12 border-status-warning/50 ring-1 ring-status-warning/40'
                  : 'bg-status-warning/8 border-status-warning/25 hover:border-status-warning/40',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-status-warning" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-status-warning">Diterima Dimuka</span>
                </div>
                {filter === 'unearned' && <span className="text-[8px] font-bold uppercase text-status-warning">aktif</span>}
              </div>
              <div className="text-[16px] font-extrabold text-status-warning tabular-nums">{formatRp(data.total_unearned)}</div>
              <p className="text-[9px] text-text-subtle mt-0.5">Belum earned (2401)</p>
            </button>
          </div>

          {/* Progress bar earned vs total */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Porsi Diakui</span>
              <span className="text-[10px] font-extrabold text-status-healthy tabular-nums">{earnedPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-status-healthy transition-all"
                style={{ width: `${earnedPct}%` }}
              />
            </div>
          </div>

          {/* Filter aktif pill */}
          {filter !== 'all' && (
            <div className="flex items-center gap-2 px-4 pb-2">
              <span className="text-[10px] text-text-muted">
                Menampilkan: <strong className="text-text">{filter === 'earned' ? 'iklan yang sudah ada earned' : 'iklan yang masih diterima dimuka'}</strong> ({displayRows.length})
              </span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-[10px] font-bold uppercase tracking-wide text-ads hover:underline"
              >
                Reset
              </button>
            </div>
          )}

          {/* Per-ad table */}
          {displayRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Layers className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                {data.rows.length === 0
                  ? 'Belum ada iklan berbayar dengan periode tayang.'
                  : 'Tidak ada iklan untuk filter ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full border-collapse">
                <thead className="bg-surface-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Ad</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Progres</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">Nilai</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">Earned</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">Dimuka</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => {
                    const meta = STATUS_META[r.status];
                    const pct = r.days_total > 0
                      ? Math.round((r.days_elapsed / r.days_total) * 100)
                      : 0;
                    return (
                      <tr key={r.ad_id} className="border-t border-border hover:bg-surface-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-ads tabular-nums whitespace-nowrap">
                          {r.ad_display_id}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', meta.cls)}>
                            <meta.Icon size={9} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden min-w-[50px]">
                              <div className="h-full rounded-full bg-ads" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] text-text-muted tabular-nums whitespace-nowrap">
                              {r.days_elapsed}/{r.days_total}h
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-text tabular-nums">{formatRp(r.amount)}</td>
                        <td className="px-3 py-2.5 text-right text-[11px] font-bold text-status-healthy tabular-nums">{formatRp(r.earned)}</td>
                        <td className="px-3 py-2.5 text-right text-[11px] text-status-warning tabular-nums">{formatRp(r.unearned)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note */}
          <div className="flex items-start gap-2 m-4 p-3 rounded-lg bg-status-info/4 border border-status-info/20">
            <Layers size={12} className="text-status-info shrink-0 mt-0.5" />
            <p className="text-[10px] text-status-info leading-relaxed">
              <strong>Accrual vs Cash:</strong> "Total Kas Masuk" = uang sudah diterima.
              "Sudah Diakui" = porsi yang jadi pendapatan sesuai hari tayang (straight-line).
              Angka ini basis laporan PT &amp; pajak — terpisah dari angka cash di atas.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
