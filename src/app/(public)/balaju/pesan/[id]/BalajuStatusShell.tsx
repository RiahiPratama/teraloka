'use client';

// src/app/(public)/balaju/pesan/[id]/BalajuStatusShell.tsx
// F7-3b — Halaman status BALAJU HIDUP. Polling GET /rides/:id (5s, stop di terminal).
// Marketplace berbasis offer: status 'open' + ada ride_offers pending -> rider PILIH
//   offer (POST /:id/select). State machine asli: open -> matched -> ongoing -> completed;
//   plus cancelled & no_driver (terminal). Tarif BEKU dari order (offered/driver/komisi).
// WAJAH only — kontrak backend dihormati apa adanya (GET /:id TIDAK embed nama/plat driver,
//   jadi kartu driver = rating + tier + tarif saja; tidak mengarang field).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike, Car, Package, MapPin, Star, ShieldCheck, Check, Loader2, X, RotateCcw, Search,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import '@/components/balaju/public/balaju-landing.css';

const ORDER_URL = '/balaju/pesan';

type RideStatus = 'open' | 'matched' | 'ongoing' | 'completed' | 'cancelled' | 'no_driver';
type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

interface RideOffer {
  id: string;
  request_id: string;
  driver_id: string;
  accepts_fare: boolean;
  counter_fare: number | null;
  status: string; // pending | selected | rejected | expired
  driver_rating_snapshot: number | null;
  driver_tier_snapshot: string | null;
}

interface RideDetail {
  id: string;
  status: RideStatus;
  service_type: ServiceType;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_estimate_m: number | null;
  offered_fare: number | null;
  driver_earning: number | null;
  commission_amount: number | null;
  agreed_fare: number | null;
  selected_driver_id: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  ride_offers?: RideOffer[];
}

function rupiah(n: number | null | undefined): string {
  return 'Rp ' + Number(n ?? 0).toLocaleString('id-ID');
}

const SERVICE_META: Record<ServiceType, { Icon: typeof Bike; label: string }> = {
  ride_bike: { Icon: Bike, label: 'Ojek' },
  ride_car: { Icon: Car, label: 'Mobil' },
  courier: { Icon: Package, label: 'Kurir' },
};

const TERMINAL: RideStatus[] = ['completed', 'cancelled', 'no_driver'];

// open=0, matched=1, ongoing=2, completed=3. cancelled/no_driver = -1 (mode banner).
function stepOf(s: RideStatus): number {
  return s === 'open' ? 0 : s === 'matched' ? 1 : s === 'ongoing' ? 2 : s === 'completed' ? 3 : -1;
}

const STEPS = ['Cari driver', 'Driver siap', 'Perjalanan', 'Selesai'];

export function BalajuStatusShell({ rideId }: { rideId: string }) {
  const api = useApi();
  const router = useRouter();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<() => void>(() => {});

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchRide = useCallback(async () => {
    try {
      const data = await api.get<RideDetail>('/rides/' + rideId);
      setRide(data);
      setErr(null);
      if (TERMINAL.includes(data.status)) stopPolling();
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        stopPolling();
        router.push('/login?redirect=' + ORDER_URL + '/' + rideId);
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        stopPolling();
        setErr('Pesanan tidak ditemukan.');
        return;
      }
      setErr('Gagal memuat status. Mencoba lagi...');
    } finally {
      setLoading(false);
    }
  }, [api, rideId, router, stopPolling]);

  // Jaga closure terbaru tanpa reset interval tiap render.
  fetchRef.current = fetchRide;

  useEffect(() => {
    fetchRef.current();
    timerRef.current = setInterval(() => fetchRef.current(), 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [rideId]);

  async function selectOffer(offerId: string) {
    if (acting) return;
    setActing(true);
    setErr(null);
    try {
      await api.post('/rides/' + rideId + '/select', { offer_id: offerId });
      await fetchRide();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memilih driver. Coba lagi.');
    } finally {
      setActing(false);
    }
  }

  async function cancelRide() {
    const reason = cancelReason.trim();
    if (!reason) {
      setErr('Alasan batal wajib diisi.');
      return;
    }
    if (acting) return;
    setActing(true);
    setErr(null);
    try {
      await api.post('/rides/' + rideId + '/cancel', { reason });
      setCancelOpen(false);
      setCancelReason('');
      await fetchRide();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : 'Gagal membatalkan. Coba lagi.');
    } finally {
      setActing(false);
    }
  }

  // ── Loading awal ──
  if (loading && !ride) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat status pesanan...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-[var(--bl-muted)]">{err ?? 'Pesanan tidak ditemukan.'}</p>
          <Link href={ORDER_URL} className="mt-5 inline-block rounded-xl border border-[var(--bl-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--bl-forest-d)]">
            ← Pesan lagi
          </Link>
        </div>
      </div>
    );
  }

  const meta = SERVICE_META[ride.service_type] ?? SERVICE_META.ride_bike;
  const ServiceIcon = meta.Icon;
  const step = stepOf(ride.status);
  const headlineFare = ride.agreed_fare ?? ride.offered_fare;
  const distanceKm = ((ride.distance_estimate_m ?? 0) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const offers = (ride.ride_offers ?? []);
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const selectedOffer = offers.find((o) => o.status === 'selected') ?? null;
  const canCancel = ride.status === 'open' || ride.status === 'matched';
  const offerFare = (o: RideOffer) => (o.accepts_fare ? ride.offered_fare ?? 0 : o.counter_fare ?? 0);

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--bl-forest)] text-white">
            <ServiceIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-none">
            <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">BALAJU {meta.label}</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--bl-muted)]">#{ride.id.slice(0, 8)}</div>
          </div>
          {!TERMINAL.includes(ride.status) && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bl-forest-10)] px-2.5 py-1 text-[10px] font-bold text-[var(--bl-forest-d)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--bl-forest-70)]" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--bl-forest)]" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Stepper (sembunyi saat cancelled/no_driver) */}
        {step >= 0 && (
          <div className="mt-6 flex items-center">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <div key={label} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || current ? 'bg-[var(--bl-forest)]' : 'bg-[var(--bl-line)]'}`} />
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold ${
                      done ? 'border-[var(--bl-forest)] bg-[var(--bl-forest)] text-white'
                        : current ? 'border-[var(--bl-forest)] bg-white text-[var(--bl-forest)]'
                          : 'border-[var(--bl-line)] bg-white text-[var(--bl-muted)]'
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? 'opacity-0' : done ? 'bg-[var(--bl-forest)]' : 'bg-[var(--bl-line)]'}`} />
                  </div>
                  <span className={`mt-1.5 text-[10px] font-semibold ${current || done ? 'text-[var(--bl-forest-d)]' : 'text-[var(--bl-muted)]'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Banner terminal cancelled / no_driver */}
        {ride.status === 'cancelled' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-500"><X className="h-6 w-6" /></span>
            <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Pesanan dibatalkan</h1>
            {ride.cancel_reason && <p className="mt-1 text-sm text-[var(--bl-muted)]">Alasan: {ride.cancel_reason}</p>}
          </div>
        )}
        {ride.status === 'no_driver' && (
          <div className="mt-6 rounded-2xl border border-[var(--bl-line)] bg-[var(--bl-amber-15)] p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--bl-amber)]"><Search className="h-6 w-6" /></span>
            <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Belum ada driver tersedia</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">Maaf, belum ada driver di dekatmu saat ini. Coba pesan lagi sebentar.</p>
          </div>
        )}

        {/* Judul status hidup */}
        {ride.status === 'open' && (
          <div className="mt-6 text-center">
            <h1 className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">
              {pendingOffers.length > 0 ? 'Pilih driver kamu' : 'Mencari driver terdekat...'}
            </h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">
              {pendingOffers.length > 0
                ? `${pendingOffers.length} driver menawarkan diri — pilih satu untuk lanjut.`
                : 'Tunggu sebentar, kami sedang menghubungi driver di sekitarmu.'}
            </p>
          </div>
        )}
        {ride.status === 'matched' && (
          <div className="mt-6 text-center">
            <h1 className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">Driver menuju titik jemput</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">Driver sudah dipilih. Tunggu di titik jemput ya.</p>
          </div>
        )}
        {ride.status === 'ongoing' && (
          <div className="mt-6 text-center">
            <h1 className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">Perjalanan berlangsung</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">Selamat jalan! Pantau perjalananmu di sini.</p>
          </div>
        )}
        {ride.status === 'completed' && (
          <div className="mt-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-forest)] text-white"><Check className="h-6 w-6" /></span>
            <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-forest-d)]">Perjalanan selesai</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">Terima kasih sudah pakai BALAJU. Jalan kita, terhubung.</p>
          </div>
        )}

        {/* Rute */}
        <div className="mt-5 flex gap-3 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
          <div className="flex flex-col items-center pt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--bl-forest)]" />
            <span className="my-1 h-8 w-px bg-[var(--bl-line)]" />
            <MapPin className="h-4 w-4 text-[var(--bl-amber)]" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Jemput</div>
              <div className="text-sm font-semibold text-[var(--bl-ink)]">{ride.pickup_address || 'Titik jemput'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
              <div className="text-sm font-semibold text-[var(--bl-ink)]">{ride.dropoff_address || 'Tujuan'}</div>
            </div>
          </div>
        </div>

        {/* Penawaran masuk (status open) */}
        {ride.status === 'open' && pendingOffers.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {pendingOffers.map((o) => (
              <div key={o.id} className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
                    <Bike className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--bl-ink)]">
                      Driver
                      {o.driver_tier_snapshot && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bl-forest-10)] px-2 py-0.5 text-[10px] font-bold capitalize text-[var(--bl-forest-d)]">
                          <ShieldCheck className="h-3 w-3" /> {o.driver_tier_snapshot}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--bl-muted)]">
                      <Star className="h-3 w-3 fill-[var(--bl-amber)] text-[var(--bl-amber)]" />
                      {o.driver_rating_snapshot != null ? o.driver_rating_snapshot.toFixed(1) : 'Baru'}
                    </div>
                  </div>
                  <div className="bl-display shrink-0 text-base font-extrabold text-[var(--bl-forest)]">{rupiah(offerFare(o))}</div>
                </div>
                <button
                  onClick={() => selectOffer(o.id)}
                  disabled={acting}
                  className="bl-shadow-soft mt-3 w-full rounded-xl bg-[var(--bl-forest)] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
                >
                  {acting ? 'Memproses...' : 'Pilih driver ini'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mencari (open, belum ada offer) */}
        {ride.status === 'open' && pendingOffers.length === 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--bl-line)] bg-white py-6 text-sm text-[var(--bl-muted)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--bl-forest)]" /> Menunggu driver merespons...
          </div>
        )}

        {/* Kartu driver terpilih (matched / ongoing) */}
        {(ride.status === 'matched' || ride.status === 'ongoing') && (
          <div className="bl-shadow-soft mt-4 flex items-center gap-3 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
              <Bike className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--bl-ink)]">
                Driver kamu
                {selectedOffer?.driver_tier_snapshot && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bl-forest-10)] px-2 py-0.5 text-[10px] font-bold capitalize text-[var(--bl-forest-d)]">
                    <ShieldCheck className="h-3 w-3" /> {selectedOffer.driver_tier_snapshot}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--bl-muted)]">
                <Star className="h-3 w-3 fill-[var(--bl-amber)] text-[var(--bl-amber)]" />
                {selectedOffer?.driver_rating_snapshot != null ? selectedOffer.driver_rating_snapshot.toFixed(1) : 'Baru'}
              </div>
            </div>
          </div>
        )}

        {/* Kartu tarif (beku dari order) */}
        {headlineFare != null && (
          <div className="bl-shadow-soft mt-4 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--bl-muted)]">
                Total bayar{ride.distance_estimate_m ? <span className="font-medium"> · ± {distanceKm} km</span> : null}
              </span>
              <span className="bl-display text-2xl font-extrabold text-[var(--bl-forest)]">{rupiah(headlineFare)}</span>
            </div>
            <div className="mt-2 space-y-1 border-t border-dashed border-[var(--bl-line)] pt-2 text-[11px]">
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span className="flex items-center gap-1.5"><Bike className="h-3.5 w-3.5 text-[var(--bl-forest)]" /> Driver terima (utuh)</span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(ride.driver_earning)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--bl-amber)]" /> Fee TeraLoka</span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(ride.commission_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {err && <p className="mt-3 text-center text-xs font-medium text-red-500">{err}</p>}

        {/* Aksi batal (open / matched) */}
        {canCancel && (
          <div className="mt-4">
            {!cancelOpen ? (
              <button
                onClick={() => { setCancelOpen(true); setErr(null); }}
                className="w-full rounded-xl border border-[var(--bl-line)] bg-white py-3 text-center text-sm font-semibold text-[var(--bl-muted)] transition hover:border-red-200 hover:text-red-500"
              >
                Batalkan pesanan
              </button>
            ) : (
              <div className="rounded-2xl border border-[var(--bl-line)] bg-white p-4">
                <label className="text-xs font-semibold text-[var(--bl-ink)]">Alasan batal</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Mis. salah titik jemput, batal berangkat..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--bl-line)] bg-white px-3 py-2 text-sm text-[var(--bl-ink)] outline-none focus:border-[var(--bl-forest)]"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { setCancelOpen(false); setCancelReason(''); setErr(null); }}
                    className="flex-1 rounded-xl border border-[var(--bl-line)] bg-white py-2.5 text-sm font-semibold text-[var(--bl-muted)]"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={cancelRide}
                    disabled={acting}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {acting ? 'Membatalkan...' : 'Konfirmasi batal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pesan lagi (terminal) */}
        {TERMINAL.includes(ride.status) && (
          <Link
            href={ORDER_URL}
            className="bl-shadow-lift mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-4 text-center text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
          >
            <RotateCcw className="h-4 w-4" /> Pesan lagi
          </Link>
        )}

        <p className="mt-4 text-center text-[11px] text-[var(--bl-muted)]">TeraLoka BALAJU · Maluku Utara</p>
      </div>
    </div>
  );
}
