'use client';

// src/app/mitra/driver/penghasilan/DriverEarningsShell.tsx
// T2 (10 Jun 2026) — DASHBOARD PENGHASILAN DRIVER. Mirror pola DriverHomeShell (useApi, token bl-).
// Sumber: GET /driver/earnings (ringkasan + debt-gate) & GET /driver/trips?period= (riwayat).
//
// MODEL EKONOMI BALAJU (cash-first): driver terima cash langsung dari penumpang (earning),
//   komisi TeraLoka jadi UTANG yg wajib disetor. JADI: bukan "saldo/tarik" (wallet) —
//   tapi "penghasilan tercatat" + "komisi yg harus disetor" (debt-gate Rp100k).

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Star, Loader2, Bike, Car, Package, ArrowUpRight,
  ShieldCheck, AlertTriangle, MapPin, Check, Wallet,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import '@/components/balaju/public/balaju-landing.css';

const HOME_URL = '/mitra/driver';

type ServiceType = 'ride_bike' | 'ride_car' | 'courier';
const SERVICE_ICON: Record<string, typeof Bike> = { ride_bike: Bike, ride_car: Car, courier: Package };

type Period = 'today' | 'week' | 'month' | 'all';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: '7 Hari' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'all', label: 'Semua' },
];

interface Earnings {
  driver: { id: string; name: string | null; rating_avg: number; rating_count: number; is_online: boolean };
  earnings: { currency: string; today: number; week: number; total: number; rides_today: number; rides_week: number; rides_total: number };
  commission: { currency: string; outstanding: number; settled: number; debt_threshold: number; remaining_to_lock: number; status: 'lunas' | 'berutang' | 'locked'; locked: boolean; last_settled_at: string | null };
}
interface Trip {
  id: string; completed_at: string | null; pickup: string | null; dropoff: string | null;
  service_type: string; fare: number; earning: number; commission: number; remitted: boolean;
}
interface TripsResult {
  period: Period; trips: Trip[];
  summary: { count: number; total_earning: number; total_commission: number };
  paging: { limit: number; offset: number; has_more: boolean };
}

function rupiah(n: number | null | undefined): string {
  return 'Rp ' + Number(n ?? 0).toLocaleString('id-ID');
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura',
  });
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jayapura' });
}
// Ringkas alamat: ambil segmen pertama sebelum koma / '›' (nama kelurahan).
function shortAddr(s: string | null): string {
  if (!s) return '—';
  const first = s.split(/[,›]/)[0]?.trim();
  return first || s.trim();
}

export default function DriverEarningsShell() {
  const api = useApi();

  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>('week');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsSummary, setTripsSummary] = useState<TripsResult['summary'] | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Ringkasan (sekali).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await api.get<Earnings>('/driver/earnings');
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof ApiError ? e.message : 'Gagal memuat penghasilan.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api]);

  // Riwayat per periode.
  const fetchTrips = useCallback(async (p: Period, offset: number, append: boolean) => {
    if (append) setLoadingMore(true); else setTripsLoading(true);
    try {
      const r = await api.get<TripsResult>(`/driver/trips?period=${p}&limit=20&offset=${offset}`);
      setTrips((prev) => (append ? [...prev, ...r.trips] : r.trips));
      setTripsSummary(r.summary);
      setHasMore(r.paging.has_more);
    } catch {
      if (!append) { setTrips([]); setTripsSummary(null); setHasMore(false); }
    } finally {
      if (append) setLoadingMore(false); else setTripsLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchTrips(period, 0, false); }, [period, fetchTrips]);

  if (loading) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat penghasilan…</p>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-amber-15)] text-[var(--bl-amber)]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--bl-ink)]">{err || 'Data tidak tersedia'}</p>
          <Link href={HOME_URL} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--bl-forest)]">
            <ChevronLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const { driver, earnings, commission } = data;
  const metrics = [
    { label: 'Hari ini', value: earnings.today, sub: `${earnings.rides_today} trip` },
    { label: '7 hari', value: earnings.week, sub: `${earnings.rides_week} trip` },
    { label: 'Total', value: earnings.total, sub: `${earnings.rides_total} trip` },
  ];

  // Debt-gate visual.
  const pct = Math.min(100, Math.round((commission.outstanding / commission.debt_threshold) * 100));
  const gate = commission.status === 'lunas'
    ? { ring: 'var(--bl-forest)', bg: 'var(--bl-forest-10)', text: 'var(--bl-forest-d)', Icon: ShieldCheck,
        title: 'Komisi lunas', note: 'Aman — kamu bebas narik kapan saja.' }
    : commission.status === 'berutang'
      ? { ring: 'var(--bl-amber)', bg: 'var(--bl-amber-15)', text: 'var(--bl-amber)', Icon: Wallet,
          title: 'Komisi belum disetor', note: `Sisa Rp ${commission.remaining_to_lock.toLocaleString('id-ID')} lagi sebelum akun terkunci.` }
      : { ring: '#dc2626', bg: '#fee2e2', text: '#dc2626', Icon: AlertTriangle,
          title: 'Akun terkunci', note: 'Setor komisi dulu biar bisa online lagi.' };

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6 md:pt-12">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <Link href={HOME_URL} aria-label="Kembali"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--bl-line)] bg-white text-[var(--bl-ink)] transition hover:bg-[var(--bl-cream)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="leading-none">
            <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">Penghasilan</div>
            <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">{driver.name || 'Driver'} · Ternate</div>
          </div>
          {driver.rating_count > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--bl-amber-15)] px-2.5 py-1 text-[11px] font-bold text-[var(--bl-amber)]">
              <Star className="h-3 w-3 fill-[var(--bl-amber)]" /> {driver.rating_avg.toFixed(1)}
              <span className="font-medium text-[var(--bl-muted)]">({driver.rating_count})</span>
            </span>
          )}
        </div>

        {/* HERO — penghasilan hari ini */}
        <div className="bl-shadow-lift mt-5 overflow-hidden rounded-3xl bg-[var(--bl-forest)] p-5 text-white">
          <div className="text-[13px] font-medium text-white/80">Pendapatan hari ini</div>
          <div className="bl-display mt-1 text-4xl font-extrabold leading-none">{rupiah(earnings.today)}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> {earnings.rides_today} trip selesai hari ini
          </div>
        </div>

        {/* Strip metrik */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {metrics.map((m) => (
            <div key={m.label} className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-3">
              <div className="text-[11px] font-medium text-[var(--bl-muted)]">{m.label}</div>
              <div className="bl-display mt-1 text-[15px] font-extrabold text-[var(--bl-ink)]">{rupiah(m.value)}</div>
              <div className="mt-0.5 text-[10px] text-[var(--bl-muted)]">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* SIGNATURE — kartu komisi / debt-gate */}
        <div className="bl-shadow-soft mt-3 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              style={{ background: gate.bg, color: gate.text }}>
              <gate.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[var(--bl-ink)]">{gate.title}</div>
              <div className="mt-0.5 text-xs text-[var(--bl-muted)]">{gate.note}</div>
            </div>
            <div className="text-right">
              <div className="bl-display text-lg font-extrabold" style={{ color: gate.text }}>{rupiah(commission.outstanding)}</div>
              <div className="text-[10px] text-[var(--bl-muted)]">belum disetor</div>
            </div>
          </div>

          {/* progress menuju batas kunci */}
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bl-cream)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: gate.ring }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--bl-muted)]">
              <span>Rp 0</span>
              <span>Batas kunci {rupiah(commission.debt_threshold)}</span>
            </div>
          </div>

          {commission.settled > 0 && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--bl-line)] pt-3 text-[11px] text-[var(--bl-muted)]">
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--bl-forest)]" />
              <span>
                Sudah disetor: <span className="font-semibold text-[var(--bl-ink)]">{rupiah(commission.settled)}</span>
                {commission.last_settled_at && <> · terakhir {fmtDate(commission.last_settled_at)}</>}
              </span>
            </div>
          )}
        </div>

        {/* RIWAYAT — tab periode + list */}
        <div className="mt-6">
          <h2 className="bl-display text-sm font-extrabold text-[var(--bl-forest-d)]">Riwayat order</h2>

          {/* tab periode */}
          <div className="mt-3 flex gap-1.5 rounded-2xl border border-[var(--bl-line)] bg-white p-1">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`flex-1 rounded-xl py-2 text-[12px] font-bold transition ${
                  period === p.key ? 'bg-[var(--bl-forest)] text-white' : 'text-[var(--bl-muted)] hover:bg-[var(--bl-cream)]'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* ringkasan periode */}
          {tripsSummary && !tripsLoading && (
            <div className="bl-shadow-soft mt-3 flex items-center justify-between rounded-2xl border border-[var(--bl-line)] bg-white px-4 py-3">
              <div>
                <div className="text-[11px] text-[var(--bl-muted)]">{tripsSummary.count} trip · periode ini</div>
                <div className="bl-display mt-0.5 text-lg font-extrabold text-[var(--bl-ink)]">{rupiah(tripsSummary.total_earning)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--bl-muted)]">Fee TeraLoka</div>
                <div className="mt-0.5 text-sm font-bold text-[var(--bl-amber)]">{rupiah(tripsSummary.total_commission)}</div>
              </div>
            </div>
          )}

          {/* list trip */}
          <div className="mt-3 space-y-2.5">
            {tripsLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--bl-forest)]" />
              </div>
            ) : trips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--bl-line)] bg-white py-10 text-center">
                <MapPin className="mx-auto h-7 w-7 text-[var(--bl-muted)]" />
                <p className="mt-2 text-sm font-semibold text-[var(--bl-ink)]">Belum ada trip</p>
                <p className="mt-0.5 text-xs text-[var(--bl-muted)]">Belum ada order selesai di periode ini.</p>
              </div>
            ) : (
              trips.map((t) => {
                const Icon = SERVICE_ICON[t.service_type] || Bike;
                return (
                  <div key={t.id} className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--bl-forest-10)] text-[var(--bl-forest-d)]">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--bl-ink)]">
                          <span className="truncate">{shortAddr(t.pickup)}</span>
                          <span className="text-[var(--bl-muted)]">→</span>
                          <span className="truncate">{shortAddr(t.dropoff)}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">{fmtDateTime(t.completed_at)}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="bl-display text-sm font-extrabold text-[var(--bl-forest-d)]">{rupiah(t.earning)}</div>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          t.remitted
                            ? 'bg-[var(--bl-forest-10)] text-[var(--bl-forest-d)]'
                            : 'bg-[var(--bl-amber-15)] text-[var(--bl-amber)]'
                        }`}>
                          {t.remitted ? 'Komisi disetor' : 'Komisi belum'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* muat lebih */}
          {hasMore && !tripsLoading && (
            <button onClick={() => fetchTrips(period, trips.length, true)} disabled={loadingMore}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bl-line)] bg-white py-3 text-sm font-bold text-[var(--bl-forest)] transition hover:bg-[var(--bl-cream)] disabled:opacity-50">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Muat lebih banyak
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-[var(--bl-muted)]">
          Penghasilan diterima tunai langsung dari penumpang · komisi TeraLoka disetor terpisah
        </p>
      </div>
    </div>
  );
}
