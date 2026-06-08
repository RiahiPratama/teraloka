'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Financial (Audit Komisi + Setoran F4b)
// Path: /admin/balaju/financial   Route guard: admin/layout.tsx (auth + role)
//
// 🛡️ WAJAH MURNI — nol logika. Semua hitung di OTAK (GET /admin/balaju/financial).
// 🛡️ AKRUAL + SETORAN: komisi = piutang (1202) saat ride completed; turun saat driver
//   setor (F4b). per_driver bedain sudah/belum setor + status + aging. Catat setoran =
//   POST /admin/balaju/commission-remittance (super_admin). Preview FIFO = GET .../preview.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet, AlertTriangle, Ghost, Scale, CheckCircle2, RefreshCw, Users,
  X, Lock, ArrowDownToLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };

interface PerService { service_type: string; rides: number; commission: number; trip_value: number; driver_earning: number }
interface PerDriver {
  driver_id: string;
  name: string | null;
  phone: string | null;
  plate: string | null;
  rides: number;
  total_accrued: number;
  sudah_setor: number;
  belum_setor: number;
  oldest_unremitted_at: string | null;
  aging_days: number;
  status: 'lunas' | 'berutang' | 'locked';
  locked: boolean;
}
interface Settlement {
  currency: string;
  outstanding: number;
  settled: number;
  debt_threshold: number;
  locked_driver_count: number;
  driver_count: number;
}
interface FlaggedRow {
  id: string;
  created_at: string | null;
  service_type: string;
  distance_estimate_m: number | null;
  stored: { offered: number; agreed: number; driver_earning: number; commission: number };
  recomputed: { total: number; driver_earning: number; commission: number } | null;
  imbalance: number;
  imbalanced: boolean;
  non_reproducible: boolean;
}
interface FinancialResponse {
  commission: { currency: string; total_accrued: number; today: number };
  integrity: {
    completed_count: number;
    consistent_count: number;
    imbalance_count: number;
    non_reproducible_count: number;
    unknown_count: number;
    total_imbalance: number;
    flagged: FlaggedRow[];
  };
  per_service: PerService[];
  per_driver: PerDriver[];
  settlement: Settlement | null;
  meta: { scope: string; generated_at: string; source: string; note: string };
}

interface PreviewResponse {
  driver_id: string;
  amount: number;
  total_pending: number;
  total_covered: number;
  surplus: number;
  ride_count: number;
  rides: { ride_id: string; commission_amount: number; completed_at: string | null }[];
}

const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const short = (s: string) => (typeof s === 'string' ? s.slice(0, 8) : '—');
const fdate = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return s; }
};

const STATUS_BADGE: Record<PerDriver['status'], { status: 'healthy' | 'warning' | 'critical'; label: string }> = {
  lunas:    { status: 'healthy',  label: 'lunas' },
  berutang: { status: 'warning',  label: 'berutang' },
  locked:   { status: 'critical', label: 'terkunci' },
};

export default function AdminBalajuFinancialPage() {
  const api = useApi();
  const [data, setData] = useState<FinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setoranFor, setSetoranFor] = useState<PerDriver | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<FinancialResponse>('/admin/balaju/financial');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data finansial');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const intg = data?.integrity;
  const dirty = !!intg && (intg.imbalance_count > 0 || intg.non_reproducible_count > 0);
  const maxSvc = Math.max(1, ...(data?.per_service ?? []).map((s) => s.commission));
  const settlement = data?.settlement ?? null;

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">
            <Wallet size={22} className="text-bapasiar" /> Financial — Komisi & Setoran
            <Badge variant="status" status="info">AKRUAL</Badge>
          </h1>
          <p className="mt-1 text-sm text-text-muted">Piutang komisi (1202), setoran driver, & integritas data per order</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-muted disabled:opacity-50"
        >
          <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> Muat ulang
        </button>
      </div>

      {/* Banner: model akrual */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border-light bg-surface-muted px-3 py-2.5 text-xs text-text-muted">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-warning" />
        <span>
          Model <span className="font-semibold text-text">akrual</span>: tiap ride selesai mengakui komisi sebagai{' '}
          <span className="font-semibold text-text">piutang ke driver (akun 1202)</span> — driver pegang uang tunai. Saat driver{' '}
          <span className="font-semibold text-text">setor</span>, piutang turun & kas naik. <span className="font-semibold text-text">Belum setor</span> = sisa terutang; <span className="font-semibold text-text">sudah setor</span> = sudah masuk kas.
        </span>
      </div>

      {/* States */}
      {loading && !data && <div className="py-16 text-center text-sm text-text-muted">Memuat data finansial…</div>}
      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-bapasiar hover:underline">Coba lagi</button>
        </Card>
      )}

      {data && (
        <>
          {/* KPI */}
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={<CheckCircle2 size={15} className="text-bapasiar" />} label="Order completed" value={String(intg?.completed_count ?? 0)} sub={`${intg?.consistent_count ?? 0} konsisten`} />
            <Stat icon={<Wallet size={15} className="text-bapasiar" />} label="Piutang komisi (1202)" value={rupiah(data.commission.total_accrued)} sub={`hari ini ${rupiah(data.commission.today)}`} />
            <Stat icon={<Ghost size={15} className={cn((intg?.non_reproducible_count ?? 0) > 0 ? 'text-status-warning' : 'text-bapasiar')} />} label="Perlu tinjau" value={String(intg?.non_reproducible_count ?? 0)} sub="≠ engine sekarang" alert={(intg?.non_reproducible_count ?? 0) > 0} alertColor="warning" />
            <Stat icon={<Scale size={15} className={cn((intg?.imbalance_count ?? 0) > 0 ? 'text-status-critical' : 'text-bapasiar')} />} label="Selisih buku" value={rupiah(intg?.total_imbalance ?? 0)} sub={`${intg?.imbalance_count ?? 0} order rusak`} alert={(intg?.imbalance_count ?? 0) > 0} alertColor="critical" />
          </div>

          {/* Settlement summary */}
          {settlement && (
            <Card className="mb-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-text">
                <ArrowDownToLine size={16} className="text-bapasiar" /> Ringkasan setoran
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MiniStat label="Belum disetor" value={rupiah(settlement.outstanding)} tone={settlement.outstanding > 0 ? 'warning' : 'healthy'} />
                <MiniStat label="Sudah masuk kas" value={rupiah(settlement.settled)} tone="healthy" />
                <MiniStat
                  label="Driver terkunci"
                  value={String(settlement.locked_driver_count)}
                  sub={`utang > ${rupiah(settlement.debt_threshold)}`}
                  tone={settlement.locked_driver_count > 0 ? 'critical' : 'healthy'}
                />
              </div>
            </Card>
          )}

          {/* Diagnosa */}
          <Card variant={dirty ? undefined : 'muted'} className={cn('mb-5', dirty && 'border-status-critical')}>
            <p className="text-sm text-text-muted">
              {!dirty ? (
                <><span className="font-semibold text-status-healthy">Bersih.</span> Semua {intg?.completed_count} order completed konsisten dengan engine FARE-V2 sekarang & bukunya berimbang. Aman dipercaya sebagai akrual.</>
              ) : (
                <>
                  <span className="font-semibold text-status-critical">Perlu cleanup.</span>{' '}
                  {(intg?.imbalance_count ?? 0) > 0 && <><span className="font-semibold text-text">{intg?.imbalance_count}</span> order bukunya rusak (selisih <span className="font-semibold tabular-nums text-text">{rupiah(intg?.total_imbalance ?? 0)}</span>). </>}
                  {(intg?.non_reproducible_count ?? 0) > 0 && <><span className="font-semibold text-text">{intg?.non_reproducible_count}</span> order tidak reproducible oleh config sekarang (kemungkinan era POTONG lama atau beku di tarif lama). </>}
                  Daftar lengkapnya ada di tabel "Order bermasalah" di bawah.
                </>
              )}
            </p>
          </Card>

          {/* Per layanan */}
          <Card className="mb-5">
            <h2 className="mb-3 text-base font-bold text-text">Komisi per layanan</h2>
            <div className="space-y-3">
              {data.per_service.map((s) => (
                <div key={s.service_type}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-text">{SERVICE_LABELS[s.service_type] ?? s.service_type} <span className="font-normal text-text-muted">· {s.rides} order</span></span>
                    <span className="font-bold tabular-nums text-text">{rupiah(s.commission)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-bapasiar" style={{ width: `${(s.commission / maxSvc) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Per driver — setoran */}
          {data.per_driver.length > 0 && (
            <Card className="mb-5 overflow-hidden">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-text">
                <Users size={16} className="text-bapasiar" /> Setoran per driver <span className="font-normal text-text-muted">(siapa belum setor)</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="px-2 py-1.5 text-left font-semibold">driver</th>
                      <th className="px-2 py-1.5 text-left font-semibold">kontak</th>
                      <th className="px-2 py-1.5 text-right font-semibold">order</th>
                      <th className="px-2 py-1.5 text-right font-semibold">sudah setor</th>
                      <th className="px-2 py-1.5 text-right font-semibold">belum setor</th>
                      <th className="px-2 py-1.5 text-right font-semibold">usia</th>
                      <th className="px-2 py-1.5 text-left font-semibold">status</th>
                      <th className="px-2 py-1.5 text-right font-semibold">aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_driver.map((d) => {
                      const sb = STATUS_BADGE[d.status];
                      return (
                        <tr key={d.driver_id} className={cn('border-t border-border', d.locked && 'bg-status-critical/5')}>
                          <td className="px-2 py-2">
                            <div className="font-semibold text-text">{d.name ?? short(d.driver_id)}</div>
                            <div className="font-mono text-[10px] text-text-light">{short(d.driver_id)}{d.plate ? ` · ${d.plate}` : ''}</div>
                          </td>
                          <td className="px-2 py-2 text-text-muted">{d.phone ?? '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-text-muted">{d.rides}</td>
                          <td className="px-2 py-2 text-right font-mono tabular-nums text-status-healthy">{rupiah(d.sudah_setor)}</td>
                          <td className="px-2 py-2 text-right font-mono font-bold tabular-nums text-text">{rupiah(d.belum_setor)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-text-muted">{d.belum_setor > 0 ? `${d.aging_days}h` : '—'}</td>
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center gap-1">
                              {d.locked && <Lock size={11} className="text-status-critical" />}
                              <Badge variant="status" status={sb.status}>{sb.label}</Badge>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => setSetoranFor(d)}
                              disabled={d.belum_setor <= 0}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-bapasiar hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDownToLine size={11} /> Catat
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Order bermasalah (worklist cleanup) */}
          {(intg?.flagged.length ?? 0) > 0 && (
            <Card className="mb-5 overflow-hidden">
              <h2 className="mb-3 text-base font-bold text-text">Order bermasalah <span className="font-normal text-text-muted">({intg?.flagged.length})</span></h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="px-2 py-1.5 text-left font-semibold">order</th>
                      <th className="px-2 py-1.5 text-left font-semibold">tgl</th>
                      <th className="px-2 py-1.5 text-left font-semibold">layanan</th>
                      <th className="px-2 py-1.5 text-right font-semibold">tersimpan</th>
                      <th className="px-2 py-1.5 text-right font-semibold">recompute</th>
                      <th className="px-2 py-1.5 text-right font-semibold">selisih</th>
                      <th className="px-2 py-1.5 text-left font-semibold">tanda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intg?.flagged.map((f) => (
                      <tr key={f.id} className={cn('border-t border-border', f.imbalanced && 'bg-status-critical/5')}>
                        <td className="px-2 py-2 font-mono text-text">{short(f.id)}</td>
                        <td className="px-2 py-2 text-text-muted">{fdate(f.created_at)}</td>
                        <td className="px-2 py-2 font-semibold text-text">{SERVICE_LABELS[f.service_type] ?? f.service_type}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-text">{rupiah(f.stored.agreed || f.stored.offered)}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-text-muted">{f.recomputed ? rupiah(f.recomputed.total) : '—'}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          <span className={cn(f.imbalanced ? 'font-bold text-status-critical' : 'text-text-light')}>{f.imbalance === 0 ? '—' : rupiah(f.imbalance)}</span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {f.imbalanced && <Badge variant="status" status="critical">buku rusak</Badge>}
                            {f.non_reproducible && <Badge variant="status" status="warning">tinjau</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-text-light">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-status-warning" />
                "Buku rusak" = data benar-benar inkonsisten (target sapu). "Tinjau" = tidak reproducible oleh config sekarang — bisa fosil lama atau order sah yang beku di tarif lama; cek <span className="font-mono">created_at</span> vs riwayat edit tarif sebelum menghapus.
              </p>
            </Card>
          )}

          <p className="mt-2 text-center text-[10px] text-text-light">
            Sumber: ledger akrual (ride completed) + setoran komisi · diperbarui {data.meta.generated_at ? new Date(data.meta.generated_at).toLocaleTimeString('id-ID') : '—'}
          </p>
        </>
      )}

      {/* Modal catat setoran */}
      {setoranFor && (
        <SetoranModal
          driver={setoranFor}
          onClose={() => setSetoranFor(null)}
          onDone={() => { setSetoranFor(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// ─── Modal: Catat Setoran (FIFO preview + submit) ──────────────

function SetoranModal({ driver, onClose, onDone }: {
  driver: PerDriver;
  onClose: () => void;
  onDone: () => void;
}) {
  const api = useApi();
  const [amount, setAmount] = useState<number>(driver.belum_setor);
  const [method, setMethod] = useState<'cash' | 'transfer'>('transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Debounced FIFO preview saat amount berubah
  useEffect(() => {
    if (!(amount > 0)) { setPreview(null); return; }
    let cancelled = false;
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<PreviewResponse>(
          `/admin/balaju/commission-remittance/preview?driver_id=${driver.driver_id}&amount=${amount}`,
        );
        if (!cancelled) setPreview(res);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [amount, driver.driver_id, api]);

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      // ⚠️ Asumsi: api.post<T>(url, body). Sesuaikan kalau signature beda.
      await api.post('/admin/balaju/commission-remittance', {
        driver_id: driver.driver_id,
        amount,
        method,
        reference_code: reference || undefined,
        notes: notes || undefined,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal mencatat setoran');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-text">Catat setoran komisi</h3>
            <p className="text-xs text-text-muted">{driver.name ?? short(driver.driver_id)} · belum setor {rupiah(driver.belum_setor)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-surface-muted"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Nominal setoran</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text tabular-nums focus:border-bapasiar focus:outline-none"
            />
          </div>

          {/* Method */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Metode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['transfer', 'cash'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold',
                    method === m ? 'border-bapasiar bg-bapasiar/10 text-bapasiar' : 'border-border text-text-muted hover:bg-surface-muted',
                  )}
                >
                  {m === 'cash' ? 'Tunai → 1121' : 'Transfer → 1112'}
                </button>
              ))}
            </div>
          </div>

          {/* Ref + notes */}
          <div className="grid grid-cols-2 gap-2">
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. referensi (opsional)" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:border-bapasiar focus:outline-none" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:border-bapasiar focus:outline-none" />
          </div>

          {/* FIFO preview */}
          <div className="rounded-lg border border-border-light bg-surface-muted px-3 py-2.5 text-xs">
            {previewing ? (
              <span className="text-text-muted">Menghitung FIFO…</span>
            ) : preview ? (
              <div className="space-y-0.5 text-text-muted">
                <div className="flex justify-between"><span>Order ke-cover (FIFO)</span><span className="font-semibold text-text">{preview.ride_count} order</span></div>
                <div className="flex justify-between"><span>Total komisi ke-cover</span><span className="font-semibold tabular-nums text-text">{rupiah(preview.total_covered)}</span></div>
                {preview.surplus > 0 && <div className="flex justify-between text-status-warning"><span>Lebih bayar</span><span className="font-semibold tabular-nums">{rupiah(preview.surplus)}</span></div>}
                <div className="flex justify-between"><span>Sisa tunggakan</span><span className="font-semibold tabular-nums text-text">{rupiah(Math.max(0, preview.total_pending - preview.total_covered))}</span></div>
              </div>
            ) : (
              <span className="text-text-light">Isi nominal untuk lihat order yang akan dilunasi.</span>
            )}
          </div>

          {err && <p className="text-xs font-semibold text-status-critical">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">Batal</button>
            <button
              onClick={submit}
              disabled={submitting || !(amount > 0) || !preview || preview.ride_count === 0}
              className="flex-1 rounded-lg bg-bapasiar px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Menyimpan…' : 'Catat setoran'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function Stat({ icon, label, value, sub, alert, alertColor }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  alert?: boolean; alertColor?: 'critical' | 'warning';
}) {
  return (
    <Card className={cn(alert && alertColor === 'critical' && 'border-status-critical', alert && alertColor === 'warning' && 'border-status-warning')}>
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums text-text">{value}</div>
      {sub && <div className="text-[11px] text-text-light">{sub}</div>}
    </Card>
  );
}

function MiniStat({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone: 'healthy' | 'warning' | 'critical';
}) {
  const toneCls = tone === 'critical' ? 'text-status-critical' : tone === 'warning' ? 'text-status-warning' : 'text-status-healthy';
  return (
    <div className="rounded-lg border border-border-light bg-surface-muted px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={cn('mt-0.5 text-base font-bold tabular-nums', toneCls)}>{value}</div>
      {sub && <div className="text-[10px] text-text-light">{sub}</div>}
    </div>
  );
}
