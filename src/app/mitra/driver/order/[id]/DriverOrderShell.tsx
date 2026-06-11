'use client';

// src/app/mitra/driver/order/[id]/DriverOrderShell.tsx
// WAVE 2 (7 Jun 2026) — Layar ORDER AKTIF sisi driver. Mirror pola BalajuStatusShell.
// Driver jalanin trip:  matched --Mulai--> ongoing --Selesai--> completed (emit jurnal).
//   Batal hanya saat matched (pra-jemput, reason wajib) -> backend re-dispatch / lepas.
// Polling GET /rides/:id (5s, stop di terminal). selected_driver_id != aku -> 403 -> balik beranda.
// NOL sentuh rides.ts: pakai endpoint /start /complete /cancel /GET:id yang sudah ada & terbukti.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bike, Car, Package, MapPin, Loader2, Check, Play, Flag, X, Wallet, ShieldCheck, ChevronRight, Navigation,
  Phone, MessageCircle, User,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import '@/components/balaju/public/balaju-landing.css';

const HOME = '/mitra/driver';

type RideStatus = 'open' | 'matched' | 'arrived' | 'ongoing' | 'completed' | 'cancelled' | 'no_driver';
type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

interface RideDetail {
  id: string;
  status: RideStatus;
  service_type: ServiceType;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_estimate_m: number | null;
  offered_fare: number | null;
  driver_earning: number | null;
  commission_amount: number | null;
  agreed_fare: number | null;
  selected_driver_id: string | null;
  cancel_reason: string | null;
  // Kontak penumpang (embed backend GET /:id, hanya saat matched/ongoing; null pasca-terminal).
  rider?: { id: string; name: string | null; phone: string | null } | null;
  service_details?: { pickup_note?: string | null; dropoff_note?: string | null } | null;
}

const SERVICE_META: Record<ServiceType, { Icon: typeof Bike; label: string }> = {
  ride_bike: { Icon: Bike, label: 'Ojek' },
  ride_car: { Icon: Car, label: 'Mobil' },
  courier: { Icon: Package, label: 'Kurir' },
};

const TERMINAL: RideStatus[] = ['completed', 'cancelled', 'no_driver'];

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

export function DriverOrderShell({ rideId }: { rideId: string }) {
  const api = useApi();
  const router = useRouter();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<() => void>(() => {});

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const fetchRide = useCallback(async () => {
    try {
      const data = await api.get<RideDetail>('/rides/' + rideId);
      setRide(data);
      setErr(null);
      if (TERMINAL.includes(data.status)) stopPolling();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        stopPolling();
        router.push('/login?redirect=' + HOME + '/order/' + rideId);
        return;
      }
      // 403 = order ini bukan (lagi) punya aku (mis. habis aku batalin / reassigned). Balik beranda.
      if (e instanceof ApiError && e.status === 403) {
        stopPolling();
        router.push(HOME);
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        stopPolling();
        setErr('Order tidak ditemukan.');
        return;
      }
      setErr('Gagal memuat order. Mencoba lagi…');
    } finally {
      setLoading(false);
    }
  }, [api, rideId, router, stopPolling]);

  fetchRef.current = fetchRide;

  useEffect(() => {
    fetchRef.current();
    timerRef.current = setInterval(() => fetchRef.current(), 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [rideId]);

  async function doArrive() {
    if (acting) return;
    setActing(true); setErr(null);
    try {
      await api.post('/rides/' + rideId + '/arrive');
      await fetchRide();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menandai tiba. Coba lagi.');
    } finally {
      setActing(false);
    }
  }

  async function doStart() {
    if (acting) return;
    setActing(true); setErr(null);
    try {
      await api.post('/rides/' + rideId + '/start');
      await fetchRide();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memulai. Coba lagi.');
    } finally {
      setActing(false);
    }
  }

  async function doComplete() {
    if (acting) return;
    setActing(true); setErr(null);
    try {
      await api.post('/rides/' + rideId + '/complete');
      setConfirmDone(false);
      await fetchRide();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyelesaikan. Coba lagi.');
    } finally {
      setActing(false);
    }
  }

  async function doCancel() {
    const reason = cancelReason.trim();
    if (!reason) { setErr('Alasan batal wajib diisi.'); return; }
    if (acting) return;
    setActing(true); setErr(null);
    try {
      await api.post('/rides/' + rideId + '/cancel', { reason });
      // Setelah driver batal, order lepas dari aku -> balik beranda.
      router.push(HOME);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal membatalkan. Coba lagi.');
      setActing(false);
    }
  }

  // ── Loading awal ──
  if (loading && !ride) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat order…</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-[var(--bl-muted)]">{err ?? 'Order tidak ditemukan.'}</p>
          <button onClick={() => router.push(HOME)} className="mt-5 inline-block rounded-xl border border-[var(--bl-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--bl-forest-d)]">
            ← Kembali ke beranda
          </button>
        </div>
      </div>
    );
  }

  const meta = SERVICE_META[ride.service_type] ?? SERVICE_META.ride_bike;
  const ServiceIcon = meta.Icon;
  const headlineFare = ride.agreed_fare ?? ride.offered_fare;
  const distanceKm = ((ride.distance_estimate_m ?? 0) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const note = ride.service_details?.pickup_note;
  const dnote = ride.service_details?.dropoff_note;

  // Kontak penumpang (matched/ongoing). Pesan dibekali alamat + pin lokasi jemput (link Google
  // Maps: tap -> app + Petunjuk Arah). Plain URL, tanpa API key, GRATIS. wa.me = TEKS only; ini
  // link peta yang bisa di-tap, bukan kartu lokasi native WA (butuh WA Business API — di-defer).
  const riderWa = toWa(ride.rider?.phone);
  const pickupPin = (ride.pickup_lat != null && ride.pickup_lng != null)
    ? `https://www.google.com/maps?q=${ride.pickup_lat},${ride.pickup_lng}`
    : null;
  const waLines: string[] = [`Halo, saya driver BALAJU untuk order #${ride.id.slice(0, 8)}.`];
  if (ride.pickup_address) waLines.push(`Titik jemput: ${ride.pickup_address}`);
  if (pickupPin) waLines.push(`Lokasi: ${pickupPin}`);
  const waToRider = riderWa
    ? `https://wa.me/${riderWa}?text=${encodeURIComponent(waLines.join('\n'))}`
    : null;

  const STATUS_HEAD: Partial<Record<RideStatus, { title: string; sub: string }>> = {
    matched: { title: 'Menuju titik jemput', sub: 'Jemput penumpang di titik di bawah, lalu tandai "tiba".' },
    arrived: { title: 'Sudah di titik jemput', sub: 'Tunggu penumpang naik, lalu mulai perjalanan.' },
    ongoing: { title: 'Perjalanan berlangsung', sub: 'Antar penumpang ke tujuan dengan selamat.' },
  };
  const head = STATUS_HEAD[ride.status];

  // Deep-link navigasi ke Google Maps (HP driver) — gratis, tanpa API key.
  // matched -> arah ke titik JEMPUT; ongoing -> arah ke TUJUAN. Sembunyi kalau koordinat kosong.
  const navTarget =
    ride.status === 'matched' || ride.status === 'arrived'
      ? (ride.pickup_lat != null && ride.pickup_lng != null
          ? { lat: ride.pickup_lat, lng: ride.pickup_lng, label: 'Navigasi ke titik jemput' }
          : null)
      : ride.status === 'ongoing'
        ? (ride.dropoff_lat != null && ride.dropoff_lng != null
            ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng, label: 'Navigasi ke tujuan' }
            : null)
        : null;
  const navHref = navTarget
    ? `https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}`
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
            <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">Order {meta.label}</div>
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

        {/* Judul status (matched / ongoing) */}
        {head && (
          <div className="mt-6 text-center">
            <h1 className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">{head.title}</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">{head.sub}</p>
          </div>
        )}

        {/* Selesai */}
        {ride.status === 'completed' && (
          <div className="mt-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-forest)] text-white"><Check className="h-6 w-6" /></span>
            <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-forest-d)]">Order selesai</h1>
            <p className="mt-1 text-sm text-[var(--bl-muted)]">Penghasilanmu sudah tercatat. Terima kasih sudah narik!</p>
          </div>
        )}

        {/* Batal / lepas (jarang kelihatan; biasanya udah dibounce ke beranda) */}
        {(ride.status === 'cancelled' || ride.status === 'no_driver') && (
          <div className="mt-6 rounded-2xl border border-[var(--bl-line)] bg-[var(--bl-cream)] p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--bl-muted)]"><X className="h-6 w-6" /></span>
            <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Order tidak aktif</h1>
            {ride.cancel_reason && <p className="mt-1 text-sm text-[var(--bl-muted)]">Alasan: {ride.cancel_reason}</p>}
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
              {note && (
                <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-forest-10)] px-2 py-1.5 text-[11px] text-[var(--bl-forest-d)]">
                  <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-forest)]" />
                  <span className="min-w-0">{note}</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
              <div className="text-sm font-semibold text-[var(--bl-ink)]">{ride.dropoff_address || 'Tujuan'}</div>
              {dnote && (
                <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-amber-15)] px-2 py-1.5 text-[11px] text-[var(--bl-forest-d)]">
                  <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-amber)]" />
                  <span className="min-w-0">{dnote}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kartu penumpang (matched/arrived/ongoing) — kontak via WA / telepon.
            Kalau rider belum punya nomor (order lama) -> fallback, JANGAN hilang (driver gak buntu). */}
        {(ride.status === 'matched' || ride.status === 'arrived' || ride.status === 'ongoing') && (
          ride.rider?.phone ? (
          <div className="bl-shadow-soft mt-4 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
                <User className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Penumpang</div>
                <div className="truncate text-sm font-bold text-[var(--bl-ink)]">{ride.rider.name || 'Penumpang'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {waToRider && (
                  <a
                    href={waToRider}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bl-shadow-soft grid h-11 w-11 place-items-center rounded-full bg-[var(--bl-forest)] text-white transition hover:bg-[var(--bl-forest-d)]"
                    aria-label="WhatsApp penumpang"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
                <a
                  href={'tel:' + ride.rider.phone}
                  className="grid h-11 w-11 place-items-center rounded-full border border-[var(--bl-forest)] bg-white text-[var(--bl-forest)] transition hover:bg-[var(--bl-forest-10)]"
                  aria-label="Telepon penumpang"
                >
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          ) : (
          <div className="mt-4 rounded-2xl border border-[var(--bl-line)] bg-[var(--bl-amber-15)] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[var(--bl-amber)]">
                <User className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Penumpang</div>
                <div className="truncate text-sm font-bold text-[var(--bl-ink)]">{ride.rider?.name || 'Penumpang'}</div>
                <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">Belum mencantumkan nomor — tunggu di titik jemput.</div>
              </div>
            </div>
          </div>
          )
        )}

        {/* Kartu penghasilan driver */}
        {headlineFare != null && (
          <div className="bl-shadow-soft mt-4 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="flex items-center gap-1.5 text-xs text-[var(--bl-muted)]">
                <Wallet className="h-4 w-4 text-[var(--bl-forest)]" /> Kamu terima (utuh)
                {ride.distance_estimate_m ? <span className="font-medium"> · ± {distanceKm} km</span> : null}
              </span>
              <span className="bl-display text-2xl font-extrabold text-[var(--bl-forest)]">{rupiah(ride.driver_earning)}</span>
            </div>
            <div className="mt-2 space-y-1 border-t border-dashed border-[var(--bl-line)] pt-2 text-[11px]">
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span>Total dibayar penumpang</span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(headlineFare)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--bl-amber)]" /> Fee TeraLoka</span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(ride.commission_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {err && <p className="mt-3 text-center text-xs font-medium text-red-500">{err}</p>}

        {/* Navigasi — deep-link ke Google Maps di HP driver (gratis, tanpa API key) */}
        {navHref && (
          <a
            href={navHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bl-forest)] bg-white py-3.5 text-sm font-bold text-[var(--bl-forest-d)] transition hover:bg-[var(--bl-forest-10)]"
          >
            <Navigation className="h-4 w-4 text-[var(--bl-forest)]" />
            {navTarget?.label}
          </a>
        )}

        {/* ── AKSI ── */}
        {/* matched: "Saya tiba" → arrived: "Mulai perjalanan". Batal shared (handle no-show). */}
        {(ride.status === 'matched' || ride.status === 'arrived') && (
          <div className="mt-4 space-y-3">
            {ride.status === 'matched' ? (
              <button
                onClick={doArrive}
                disabled={acting}
                className="bl-shadow-lift flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-4 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Saya tiba di titik jemput
              </button>
            ) : (
              <button
                onClick={doStart}
                disabled={acting}
                className="bl-shadow-lift flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-4 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Mulai perjalanan
              </button>
            )}

            {!cancelOpen ? (
              <button
                onClick={() => { setCancelOpen(true); setErr(null); }}
                className="w-full rounded-xl border border-[var(--bl-line)] bg-white py-3 text-center text-sm font-semibold text-[var(--bl-muted)] transition hover:border-red-200 hover:text-red-500"
              >
                Batalkan order
              </button>
            ) : (
              <div className="rounded-2xl border border-[var(--bl-line)] bg-white p-4">
                <label className="text-xs font-semibold text-[var(--bl-ink)]">Alasan batal</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Mis. penumpang tidak ada di titik, motor mogok…"
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
                    onClick={doCancel}
                    disabled={acting}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {acting ? 'Membatalkan…' : 'Konfirmasi batal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ongoing: Selesai (dengan konfirmasi — aksi emit jurnal) */}
        {ride.status === 'ongoing' && (
          <div className="mt-4">
            {!confirmDone ? (
              <button
                onClick={() => { setConfirmDone(true); setErr(null); }}
                className="bl-shadow-lift flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-4 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
              >
                <Flag className="h-4 w-4" /> Selesaikan perjalanan
              </button>
            ) : (
              <div className="rounded-2xl border border-[var(--bl-line)] bg-white p-4 text-center">
                <p className="text-sm font-semibold text-[var(--bl-ink)]">Sudah sampai tujuan?</p>
                <p className="mt-0.5 text-xs text-[var(--bl-muted)]">Pastikan penumpang sudah turun. Aksi ini mengunci penghasilan & tidak bisa dibatalkan.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmDone(false)}
                    className="flex-1 rounded-xl border border-[var(--bl-line)] bg-white py-2.5 text-sm font-semibold text-[var(--bl-muted)]"
                  >
                    Belum
                  </button>
                  <button
                    onClick={doComplete}
                    disabled={acting}
                    className="flex-1 rounded-xl bg-[var(--bl-forest)] py-2.5 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
                  >
                    {acting ? 'Menyelesaikan…' : 'Ya, selesai'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* terminal: kembali ke beranda */}
        {TERMINAL.includes(ride.status) && (
          <button
            onClick={() => router.push(HOME)}
            className="bl-shadow-lift mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-4 text-center text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
          >
            Cari order lagi <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <p className="mt-6 text-center text-[11px] text-[var(--bl-muted)]">TeraLoka BALAJU · Mitra Driver</p>
      </div>
    </div>
  );
}
