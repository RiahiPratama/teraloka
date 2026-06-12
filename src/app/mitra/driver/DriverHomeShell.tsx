'use client';

// src/app/mitra/driver/DriverHomeShell.tsx
// WAVE 1 (7 Jun 2026) — HOME driver. Mirror pola BalajuStatusShell (useApi, polling 5s, token bl-).
// Alur: toggle ONLINE -> polling GET /nearby (undangan dispatch pending) -> Terima (POST /:id/offer accept)
//   -> auto-match (Model B) -> navigate ke layar order aktif (WAVE 2).
// is_online WAJIB true biar ke-fanout. /nearby balikin dispatch + embed ride_requests(*).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike, Car, Package, MapPin, Power, Loader2, Navigation, Timer, Wallet, Inbox, ShieldAlert, ChevronRight, Camera,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import '@/components/balaju/public/balaju-landing.css';

const ORDER_BASE = '/mitra/driver/order'; // layar order aktif (WAVE 2)
const APPLY_URL = '/mitra/driver/daftar';  // halaman pendaftaran driver (kalau ada)

type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

const SERVICE_META: Record<ServiceType, { Icon: typeof Bike; label: string }> = {
  ride_bike: { Icon: Bike, label: 'Ojek' },
  ride_car: { Icon: Car, label: 'Mobil' },
  courier: { Icon: Package, label: 'Kurir' },
};

interface NearbyRequest {
  id: string;
  service_type: ServiceType;
  pickup_address: string | null;
  dropoff_address: string | null;
  distance_estimate_m: number | null;
  offered_fare: number | null;
  driver_earning: number | null;
  commission_amount: number | null;
  service_details?: { pickup_note?: string | null; dropoff_note?: string | null } | null;
}

interface NearbyItem {
  id: string; // dispatch id
  request_id: string;
  distance_m: number | null;
  expires_at: string;
  ride_requests: NearbyRequest | NearbyRequest[] | null;
}

function rupiah(n: number | null | undefined): string {
  return 'Rp ' + Number(n ?? 0).toLocaleString('id-ID');
}

function reqOf(item: NearbyItem): NearbyRequest | null {
  const r = item.ride_requests;
  if (!r) return null;
  return Array.isArray(r) ? (r[0] ?? null) : r;
}

function kmLabel(m: number | null | undefined): string {
  return ((m ?? 0) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' km';
}

export function DriverHomeShell() {
  const api = useApi();
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [notDriver, setNotDriver] = useState(false);
  const [online, setOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [invites, setInvites] = useState<NearbyItem[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [todayEarning, setTodayEarning] = useState<number | null>(null);
  const [todayRides, setTodayRides] = useState<number>(0);
  const [needsAvatar, setNeedsAvatar] = useState(false);

  const { user } = useAuth();
  // Foto profil belum ada -> nudge banner + (kalau coba online) gate. avatar_url user-level.
  const hasAvatar = Boolean(user?.avatar_url);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<() => void>(() => {});

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Auth gate seragam dgn rider shell.
  // Auth gate. PENTING: 401 = sesi habis (redirect login). 403 ≠ sesi habis —
  // itu forbidden karena STATE (bukan driver order ini / order udah pindah /
  // belum diverifikasi admin). Redirect login saat 403 = bug "kedipan login"
  // pas terima order. 403 -> return false, ditangani caller (jangan tendang).
  const handleAuthError = useCallback((e: unknown): boolean => {
    if (e instanceof ApiError && e.status === 401) {
      stopPolling();
      router.push('/login?redirect=/mitra/driver');
      return true;
    }
    if (e instanceof ApiError && e.status === 404) {
      stopPolling();
      setNotDriver(true);
      return true;
    }
    return false;
  }, [router, stopPolling]);

  const fetchNearby = useCallback(async () => {
    try {
      const data = await api.get<NearbyItem[]>('/rides/nearby');
      setInvites(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr('Gagal memuat order. Mencoba lagi…');
    }
  }, [api, handleAuthError]);

  fetchRef.current = fetchNearby;

  // Boot: cek status driver + online awal (defensif thd shape /driver/me).
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<Record<string, any>>('/driver/me');
        const isOnline = me?.is_online ?? me?.driver?.is_online ?? false;
        setOnline(!!isOnline);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) { setNotDriver(true); }
        else if (e instanceof ApiError && e.status === 401) {
          router.push('/login?redirect=/mitra/driver'); return;
        }
        else if (e instanceof ApiError && e.status === 403) {
          // 403 = belum diverifikasi admin (BUKAN sesi habis) -> jangan redirect.
          setErr('Akun driver kamu belum diverifikasi admin.');
        }
        // error lain: biarin offline, driver bisa toggle manual.
      } finally {
        setBooting(false);
      }
    })();
    // Penghasilan hari ini (ringan, sekali — buat kartu glance di beranda).
    (async () => {
      try {
        const e = await api.get<{ earnings?: { today?: number; rides_today?: number } }>('/driver/earnings');
        setTodayEarning(e?.earnings?.today ?? 0);
        setTodayRides(e?.earnings?.rides_today ?? 0);
      } catch {
        // gagal != fatal; kartu sembunyi kalau null.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling /nearby hanya saat online. Ticker 1s buat countdown halus.
  useEffect(() => {
    if (!online) {
      stopPolling();
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      setInvites([]);
      return;
    }
    fetchRef.current();
    timerRef.current = setInterval(() => fetchRef.current(), 5000);
    tickRef.current = setInterval(() => setNowTs(Date.now()), 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [online, stopPolling]);

  async function toggleOnline(next: boolean) {
    if (toggling) return;
    setToggling(true);
    setErr(null);
    try {
      const r = await api.post<{ is_online: boolean }>('/driver/online', { online: next });
      setOnline(!!r.is_online);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        stopPolling();
        router.push('/login?redirect=/mitra/driver');
        return;
      }
      // 403 = gerbang online (verify / avatar / debt). Bedain via code (BUKAN sesi habis).
      if (e instanceof ApiError && e.status === 403) {
        setOnline(false);
        if (e.code === 'NO_AVATAR') {
          // Tandai biar UI munculin tombol "Upload foto" (ke halaman akun).
          setNeedsAvatar(true);
          setErr('Upload foto profil dulu biar bisa terima order.');
        } else {
          // not_verified / debt_exceeded -> pakai pesan dari server.
          setErr(e.message || 'Akun driver kamu belum bisa online.');
        }
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        setNotDriver(true);
        return;
      }
      setErr(e instanceof ApiError ? e.message : 'Gagal mengubah status. Coba lagi.');
    } finally {
      setToggling(false);
    }
  }

  async function accept(item: NearbyItem) {
    if (acceptingId) return;
    setAcceptingId(item.request_id);
    setErr(null);
    try {
      await api.post('/rides/' + item.request_id + '/offer', { mode: 'accept' });
      // Order ketrima -> MATIKAN polling dulu sebelum pindah layar. Cegah request
      // /nearby yang nyangkut balik 403 (state udah berubah) -> flash "kedipan login".
      stopPolling();
      // Model B: langsung matched & jadi driver-nya. Lanjut ke layar order aktif (WAVE 2).
      router.push(ORDER_BASE + '/' + item.request_id);
    } catch (e) {
      if (handleAuthError(e)) return; // cuma 401/404 di sini; 403 lanjut ke bawah
      // 403 = order udah diambil driver lain / state berubah (BUKAN sesi habis).
      // 409 = keduluan driver lain. Dua-duanya: refresh daftar, JANGAN redirect login.
      setErr(e instanceof ApiError ? e.message : 'Gagal mengambil order. Coba lagi.');
      fetchNearby();
    } finally {
      setAcceptingId(null);
    }
  }

  // ── Booting ──
  if (booting) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat dasbor driver…</p>
        </div>
      </div>
    );
  }

  // ── Bukan driver / belum terdaftar ──
  if (notDriver) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-amber-15)] text-[var(--bl-amber)]">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Kamu belum jadi driver</h1>
          <p className="mt-1 text-sm text-[var(--bl-muted)]">
            Akun ini belum terdaftar (atau belum diverifikasi) sebagai driver BALAJU.
          </p>
          <Link
            href={APPLY_URL}
            className="bl-shadow-lift mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
          >
            Daftar jadi driver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6 md:pt-12">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--bl-forest)] text-white">
            <Bike className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-none">
            <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">BALAJU Driver</div>
            <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">Dasbor mitra · Ternate</div>
          </div>
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            online ? 'bg-[var(--bl-forest-10)] text-[var(--bl-forest-d)]' : 'bg-[var(--bl-cream)] text-[var(--bl-muted)]'
          }`}>
            <span className="relative flex h-1.5 w-1.5">
              {online && <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--bl-forest-70)]" />}
              <span className={`relative h-1.5 w-1.5 rounded-full ${online ? 'bg-[var(--bl-forest)]' : 'bg-[var(--bl-muted)]'}`} />
            </span>
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Kartu toggle online */}
        <div className="bl-shadow-soft mt-5 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
              online ? 'bg-[var(--bl-forest)] text-white' : 'bg-[var(--bl-cream)] text-[var(--bl-muted)]'
            }`}>
              <Power className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[var(--bl-ink)]">
                {online ? 'Kamu online · menunggu order' : 'Kamu sedang offline'}
              </div>
              <div className="mt-0.5 text-xs text-[var(--bl-muted)]">
                {online ? 'Order masuk akan muncul di bawah otomatis.' : 'Aktifkan biar order masuk ke kamu.'}
              </div>
            </div>
            <button
              onClick={() => toggleOnline(!online)}
              disabled={toggling}
              aria-label={online ? 'Matikan online' : 'Aktifkan online'}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                online ? 'bg-[var(--bl-forest)]' : 'bg-[var(--bl-line)]'
              }`}
            >
              <span className={`absolute top-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow transition-all ${
                online ? 'left-[22px]' : 'left-0.5'
              }`}>
                {toggling && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--bl-forest)]" />}
              </span>
            </button>
          </div>
        </div>

        {err && <p className="mt-3 text-center text-xs font-medium text-red-500">{err}</p>}

        {/* Nudge avatar — foto profil WAJIB buat online. Muncul kalau belum ada foto
            (proaktif) atau habis kena gate. Link ke akun buat upload. */}
        {(!hasAvatar || needsAvatar) && (
          <Link
            href="/mitra/driver/akun"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--bl-amber)] bg-[var(--bl-amber-15)] p-3.5 transition active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--bl-amber)]">
              <Camera className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[var(--bl-ink)]">Lengkapi foto profil</div>
              <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">
                Foto wajib buat bisa terima order. Penumpang lebih percaya driver berfoto.
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[var(--bl-amber)]">Upload →</span>
          </Link>
        )}

        {/* Pendapatan hari ini — glance + entry ke detail penghasilan */}
        <Link
          href="/mitra/driver/penghasilan"
          className="bl-shadow-lift mt-3 flex items-center gap-4 overflow-hidden rounded-3xl bg-[var(--bl-forest)] p-5 text-white transition active:scale-[0.99]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Wallet className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-white/80">Pendapatan hari ini</div>
            <div className="bl-display mt-0.5 text-3xl font-extrabold leading-none">
              {todayEarning === null ? '—' : rupiah(todayEarning)}
            </div>
            <div className="mt-1 text-[11px] text-white/70">
              {todayRides} trip selesai · ketuk untuk rincian
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/70" />
        </Link>

        {/* Daftar order masuk */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="bl-display text-sm font-extrabold text-[var(--bl-forest-d)]">Order masuk</h2>
            {online && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--bl-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" /> memantau…
              </span>
            )}
          </div>

          {/* Offline */}
          {!online && (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--bl-line)] bg-white py-10 text-center">
              <Power className="mx-auto h-7 w-7 text-[var(--bl-muted)]" />
              <p className="mt-2 text-sm font-semibold text-[var(--bl-ink)]">Aktifkan dulu di atas</p>
              <p className="mt-0.5 text-xs text-[var(--bl-muted)]">Order baru muncul setelah kamu online.</p>
            </div>
          )}

          {/* Online tapi kosong */}
          {online && invites.length === 0 && (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--bl-line)] bg-white py-10 text-center">
              <Inbox className="mx-auto h-7 w-7 text-[var(--bl-muted)]" />
              <p className="mt-2 text-sm font-semibold text-[var(--bl-ink)]">Belum ada order</p>
              <p className="mt-0.5 text-xs text-[var(--bl-muted)]">Tetap online, order terdekat akan muncul di sini.</p>
            </div>
          )}

          {/* Kartu order */}
          {online && invites.map((item) => {
            const req = reqOf(item);
            if (!req) return null;
            const meta = SERVICE_META[req.service_type] ?? SERVICE_META.ride_bike;
            const SvcIcon = meta.Icon;
            const secsLeft = Math.max(0, Math.round((new Date(item.expires_at).getTime() - nowTs) / 1000));
            const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
            const ss = String(secsLeft % 60).padStart(2, '0');
            const accepting = acceptingId === item.request_id;
            const note = req.service_details?.pickup_note;
            const dnote = req.service_details?.dropoff_note;

            return (
              <div key={item.id} className="bl-shadow-soft mt-3 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
                {/* Baris atas: layanan + countdown */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bl-forest-10)] px-2.5 py-1 text-[11px] font-bold text-[var(--bl-forest-d)]">
                    <SvcIcon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    secsLeft <= 10 ? 'text-red-500' : 'text-[var(--bl-muted)]'
                  }`}>
                    <Timer className="h-3.5 w-3.5" /> sisa {mm}:{ss}
                  </span>
                </div>

                {/* Rute */}
                <div className="mt-3 flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--bl-forest)]" />
                    <span className="my-1 h-7 w-px bg-[var(--bl-line)]" />
                    <MapPin className="h-4 w-4 text-[var(--bl-amber)]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Jemput</div>
                      <div className="truncate text-sm font-semibold text-[var(--bl-ink)]">{req.pickup_address || 'Titik jemput'}</div>
                      {note && (
                        <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-forest-10)] px-2 py-1 text-[11px] text-[var(--bl-forest-d)]">
                          <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-forest)]" />
                          <span className="min-w-0">{note}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
                      <div className="truncate text-sm font-semibold text-[var(--bl-ink)]">{req.dropoff_address || 'Tujuan'}</div>
                      {dnote && (
                        <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-amber-15)] px-2 py-1 text-[11px] text-[var(--bl-forest-d)]">
                          <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-amber)]" />
                          <span className="min-w-0">{dnote}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Penghasilan driver + jarak */}
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-[var(--bl-line)] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bl-muted)]">
                    <Navigation className="h-3.5 w-3.5 text-[var(--bl-forest)]" /> ± {kmLabel(req.distance_estimate_m)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-[var(--bl-forest)]" />
                    <span className="text-[11px] text-[var(--bl-muted)]">Kamu terima</span>
                    <span className="bl-display text-base font-extrabold text-[var(--bl-forest)]">{rupiah(req.driver_earning)}</span>
                  </span>
                </div>

                {/* Terima */}
                <button
                  onClick={() => accept(item)}
                  disabled={accepting || !!acceptingId}
                  className="bl-shadow-lift mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bl-forest)] py-3 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
                >
                  {accepting ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengambil…</> : <>Terima order</>}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--bl-muted)]">TeraLoka BALAJU · Mitra Driver</p>
      </div>
    </div>
  );
}
