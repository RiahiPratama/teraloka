'use client';

// src/app/(public)/balaju/pesan/[id]/BalajuStatusShell.tsx
// F7-3b — Halaman status BALAJU HIDUP. Polling GET /rides/:id (5s, stop di terminal).
// MODEL B (auto-assign): driver yang accept LANGSUNG jadi (open->matched). Rider TIDAK memilih.
//   open = "Mencari driver..." murni. matched+ = kartu info driver (nama/HP/motor/plat/rating).
// State: open -> matched -> ongoing -> completed; plus cancelled & no_driver (terminal).
// Tarif BEKU dari order. driver/vehicle di-embed backend di GET /:id.

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike, Car, Package, MapPin, Star, ShieldCheck, Check, Loader2, X, RotateCcw, Search, Phone, MessageCircle,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import '@/components/balaju/public/balaju-landing.css';

const ORDER_URL = '/balaju/pesan';

type RideStatus = 'open' | 'matched' | 'ongoing' | 'completed' | 'cancelled' | 'no_driver';
type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

interface DriverInfo {
  id: string;
  name: string | null;
  phone: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_tier: string | null;
}

interface VehicleInfo {
  vehicle_type: string | null;
  brand_model: string | null;
  plate_number: string | null;
  color: string | null;
  year: number | null;
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
  service_details?: { pickup_note?: string | null; dropoff_note?: string | null } | null;
  driver?: DriverInfo | null;
  vehicle?: VehicleInfo | null;
}

function rupiah(n: number | null | undefined): string {
  return 'Rp ' + Number(n ?? 0).toLocaleString('id-ID');
}

// Normalisasi nomor ke format wa.me (digit only, 628xxx). DB sudah 628xxx;
// guard ini cuma jaga-jaga nomor legacy 08xxx / tanpa awalan. null kalau kosong.
function toWa(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (!d.startsWith('62')) d = '62' + d;
  return d;
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
  const canCancel = ride.status === 'open' || ride.status === 'matched';
  const driver = ride.driver ?? null;
  const vehicle = ride.vehicle ?? null;
  const vehicleLine = vehicle
    ? [vehicle.brand_model, vehicle.color].filter(Boolean).join(' · ')
    : null;

  // Kontak driver via WA. Pesan dibekali alamat + pin lokasi jemput (link Google Maps:
  // tap -> app Google Maps di titik + tombol Petunjuk Arah). Plain URL, tanpa API key, GRATIS.
  // CATATAN: wa.me cuma kirim TEKS. Pin = link peta yang bisa di-tap, BUKAN kartu lokasi native
  // WhatsApp (itu butuh WA Business API berbayar — di-defer; user tetap bisa "Bagikan Lokasi" manual).
  const driverWa = toWa(driver?.phone);
  const pickupPin = (ride.pickup_lat != null && ride.pickup_lng != null)
    ? `https://www.google.com/maps?q=${ride.pickup_lat},${ride.pickup_lng}`
    : null;
  const waLines: string[] = [`Halo, saya penumpang BALAJU untuk order #${ride.id.slice(0, 8)}.`];
  if (ride.pickup_address) waLines.push(`Titik jemput: ${ride.pickup_address}`);
  if (pickupPin) waLines.push(`Lokasi: ${pickupPin}`);
  const waToDriver = driverWa
    ? `https://wa.me/${driverWa}?text=${encodeURIComponent(waLines.join('\n'))}`
    : null;

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6 md:pt-12">
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
              const allDone = ride.status === 'completed';
              const done = i < step || allDone;
              const current = i === step && !allDone;
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
            <h1 className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">Mencari driver terdekat...</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">
              Tunggu sebentar, kami sedang menghubungi driver di sekitarmu. Begitu ada yang siap, langsung kami sambungkan.
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

        {/* Zona status HIDUP (WAJAH) — liveness + arah, BUKAN posisi GPS */}
        {ride.status === 'open' && <SearchingRadar />}
        {ride.status === 'matched' && <DriverLiveStatus variant="toPickup" />}
        {ride.status === 'ongoing' && <DriverLiveStatus variant="onTrip" />}

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
              {ride.service_details?.pickup_note && (
                <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-forest-10)] px-2 py-1.5 text-[11px] text-[var(--bl-forest-d)]">
                  <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-forest)]" />
                  <span className="min-w-0">{ride.service_details.pickup_note}</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
              <div className="text-sm font-semibold text-[var(--bl-ink)]">{ride.dropoff_address || 'Tujuan'}</div>
              {ride.service_details?.dropoff_note && (
                <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-amber-15)] px-2 py-1.5 text-[11px] text-[var(--bl-forest-d)]">
                  <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-amber)]" />
                  <span className="min-w-0">{ride.service_details.dropoff_note}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kartu driver (matched / ongoing) — info lengkap Model B */}
        {(ride.status === 'matched' || ride.status === 'ongoing') && (
          <div className="bl-shadow-soft mt-4 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
                <Bike className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-[var(--bl-ink)]">{driver?.name || 'Driver kamu'}</span>
                  {driver?.verification_tier && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--bl-forest-10)] px-2 py-0.5 text-[10px] font-bold capitalize text-[var(--bl-forest-d)]">
                      <ShieldCheck className="h-3 w-3" /> {driver.verification_tier}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--bl-muted)]">
                  <Star className="h-3 w-3 fill-[var(--bl-amber)] text-[var(--bl-amber)]" />
                  {driver?.rating_avg != null ? driver.rating_avg.toFixed(1) : 'Baru'}
                  {driver?.rating_count != null && driver.rating_count > 0 && (
                    <span className="text-[var(--bl-muted)]">· {driver.rating_count} ulasan</span>
                  )}
                </div>
              </div>
              {driver?.phone && (
                <div className="flex shrink-0 items-center gap-2">
                  {waToDriver && (
                    <a
                      href={waToDriver}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bl-shadow-soft grid h-11 w-11 place-items-center rounded-full bg-[var(--bl-forest)] text-white transition hover:bg-[var(--bl-forest-d)]"
                      aria-label="WhatsApp driver"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </a>
                  )}
                  <a
                    href={'tel:' + driver.phone}
                    className="grid h-11 w-11 place-items-center rounded-full border border-[var(--bl-forest)] bg-white text-[var(--bl-forest)] transition hover:bg-[var(--bl-forest-10)]"
                    aria-label="Telepon driver"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                </div>
              )}
            </div>

            {/* Detail kendaraan */}
            {(vehicleLine || vehicle?.plate_number) && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[var(--bl-line)] pt-3">
                <span className="min-w-0 truncate text-xs text-[var(--bl-muted)]">{vehicleLine || 'Kendaraan'}</span>
                {vehicle?.plate_number && (
                  <span className="bl-display shrink-0 rounded-md border border-[var(--bl-line)] bg-[var(--bl-cream)] px-2 py-0.5 text-xs font-extrabold tracking-wider text-[var(--bl-ink)]">
                    {vehicle.plate_number}
                  </span>
                )}
              </div>
            )}
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

// ── Animasi "mencari driver" — radar pulsing (pure CSS, scoped blstat-) ──
function SearchingRadar() {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--bl-line)] bg-white py-8">
      <style>{`
        @keyframes blstat-ping {
          0%   { transform: scale(0.3); opacity: 0.5; }
          70%  { opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes blstat-sweep { to { transform: rotate(360deg); } }
        @keyframes blstat-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .blstat-radar { position: relative; width: 150px; height: 150px; margin: 0 auto; }
        .blstat-radar > span { position: absolute; inset: 0; margin: auto; border-radius: 9999px; }
        .blstat-ring { width: 150px; height: 150px; border: 2px solid var(--bl-forest); animation: blstat-ping 2.4s ease-out infinite; }
        .blstat-ring:nth-of-type(2) { animation-delay: 0.8s; }
        .blstat-ring:nth-of-type(3) { animation-delay: 1.6s; }
        .blstat-sweep { width: 150px; height: 150px; background: conic-gradient(from 0deg, transparent 0deg, var(--bl-forest-10) 55deg, transparent 90deg); animation: blstat-sweep 2.6s linear infinite; }
        .blstat-core { width: 54px; height: 54px; display: grid; place-items: center; background: var(--bl-forest); color: #fff; box-shadow: 0 10px 22px -8px var(--bl-forest); animation: blstat-bob 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .blstat-ring, .blstat-sweep, .blstat-core { animation: none; }
        }
      `}</style>
      <div className="blstat-radar">
        <span className="blstat-sweep" />
        <span className="blstat-ring" />
        <span className="blstat-ring" />
        <span className="blstat-ring" />
        <span className="blstat-core"><Bike className="h-6 w-6" /></span>
      </div>
      <p className="mt-6 text-center text-sm font-bold text-[var(--bl-forest-d)]">Mencari driver terdekat</p>
      <p className="mt-0.5 text-center text-xs text-[var(--bl-muted)]">Menghubungi driver di sekitarmu…</p>
    </div>
  );
}

// ── Status driver HIDUP (jujur): denyut liveness + konektor mengalir ke arah tujuan. ──
// BUKAN peta & BUKAN posisi GPS. Ini indikator "order aktif & driver menuju" — benar secara
// lifecycle (status matched/ongoing dari polling), tanpa mengklaim koordinat yang tidak kita punya.
// variant 'toPickup' = menuju titik jemput (pin amber). 'onTrip' = menuju tujuan (pin forest).
function DriverLiveStatus({ variant }: { variant: 'toPickup' | 'onTrip' }) {
  const onTrip = variant === 'onTrip';
  const headline = onTrip ? 'Menuju tujuan' : 'Driver menuju ke kamu';
  const sub = onTrip
    ? 'Driver sedang mengantarmu ke tujuan.'
    : 'Driver sedang dalam perjalanan ke titik jemputmu.';
  const pinBg = onTrip ? 'var(--bl-forest-10)' : 'var(--bl-amber-15)';
  const pinFg = onTrip ? 'var(--bl-forest)' : 'var(--bl-amber)';
  return (
    <div className="mt-4 rounded-2xl border border-[var(--bl-line)] bg-white p-5">
      <style>{`
        @keyframes blive-ping { 0%{transform:scale(.4);opacity:.5} 70%{opacity:0} 100%{transform:scale(1.85);opacity:0} }
        @keyframes blive-flow { to { stroke-dashoffset: -28; } }
        @keyframes blive-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .blive-node{position:relative;display:grid;place-items:center;width:46px;height:46px;flex:none}
        .blive-ring{position:absolute;inset:0;margin:auto;width:46px;height:46px;border-radius:9999px;border:2px solid var(--bl-forest);animation:blive-ping 2.2s ease-out infinite}
        .blive-ring:nth-of-type(2){animation-delay:1.1s}
        .blive-core{position:relative;display:grid;place-items:center;width:42px;height:42px;border-radius:9999px;background:var(--bl-forest);color:#fff;box-shadow:0 8px 18px -8px var(--bl-forest);animation:blive-bob 2s ease-in-out infinite}
        .blive-line{animation:blive-flow 1s linear infinite}
        @media (prefers-reduced-motion: reduce){ .blive-ring,.blive-core,.blive-line{animation:none} }
      `}</style>
      <div className="flex items-center justify-between gap-2">
        <span className="blive-node">
          <span className="blive-ring" />
          <span className="blive-ring" />
          <span className="blive-core"><Bike className="h-5 w-5" /></span>
        </span>
        <svg viewBox="0 0 120 24" preserveAspectRatio="none" className="h-6 flex-1" aria-hidden="true">
          <line x1="2" y1="12" x2="118" y2="12" stroke="var(--bl-line)" strokeWidth="3" strokeLinecap="round" />
          <line className="blive-line" x1="2" y1="12" x2="118" y2="12" stroke="var(--bl-forest)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
        </svg>
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full" style={{ background: pinBg, color: pinFg }}>
          <MapPin className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-[var(--bl-forest-d)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--bl-forest-70)]" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--bl-forest)]" />
          </span>
          {headline}
        </div>
        <p className="mt-1 text-xs text-[var(--bl-muted)]">{sub}</p>
      </div>
      <p className="mt-4 border-t border-[var(--bl-line)] pt-2 text-center text-[10px] text-[var(--bl-muted)]">
        Status diperbarui otomatis · bukan pelacakan GPS
      </p>
    </div>
  );
}
