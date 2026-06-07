'use client';

// src/app/(public)/balaju/BalajuEntry.tsx
// F7 — Entry shell BALAJU rider. Pilih layanan + rute (peta/GPS/autocomplete) +
// estimate harga + bikin order. Konsisten gaya TeraLoka: design-system bl- (premium),
// warna forest/toska/amber, lucide icons, mobile-first.
//
// FARE-V2 (Jun 2026): kontrak /estimate model TAMBAH.
//   estimate balikin per layanan { tarif_dasar, komisi, total_bayar }.
//   - total_bayar = yang RIDER bayar (ditampilkan sebagai harga utama)
//   - tarif_dasar = driver terima UTUH; komisi = fee TeraLoka (transparan, terpisah)
//
// FIX (7 Jun 2026) — DRAFT PERSIST (anti state-loss saat login round-trip):
//   Masalah: user isi rute+harga SEBELUM login (estimate publik), tap Pesan -> redirect /login
//   -> balik -> komponen mount ulang -> useState reset -> form KOSONG (harus input ulang).
//   Solusi: simpan draft ke sessionStorage sebelum redirect login; restore + tampil RINGKASAN
//   rute pas balik (one-shot consume). NOL backend, NOL sentuh BalajuLocationStep
//   (komponen itu gak nerima initial value -> pola ringkasan + tombol "Ubah" dipakai).

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Car, Package, MapPin, Zap, ShieldCheck, Wallet, Smartphone, Pencil, type LucideIcon } from 'lucide-react';
import { BalajuLocationStep, type BalajuPoint } from '@/components/balaju/rider/BalajuLocationStep';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import '@/components/balaju/public/balaju-landing.css';

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

// FARE-V2: breakdown model TAMBAH (ganti field lama `fare`).
interface EstimateItem {
  service_type: ServiceType;
  tarif_dasar: number; // driver terima utuh
  komisi: number; // fee TeraLoka
  total_bayar: number; // yang rider bayar (tarif_dasar + komisi)
}
interface EstimateResult {
  distance_m: number;
  estimates: EstimateItem[];
}

// Draft order yang diselamatkan nyebrang login. Simpan point UTUH (JSON) biar nol field-loss.
const DRAFT_KEY = 'balaju:order-draft';
interface OrderDraft {
  service: ServiceType;
  pickup: BalajuPoint;
  dropoff: BalajuPoint;
  pickupNote: string;
  estimate: EstimateResult | null;
}

const SERVICES: {
  id: ServiceType;
  Icon: LucideIcon;
  name: string;
  desc: string;
}[] = [
  { id: 'ride_bike', Icon: Bike, name: 'BALAJU Ojek', desc: 'Ojek cepat & hemat' },
  { id: 'ride_car', Icon: Car, name: 'BALAJU Mobil', desc: 'Nyaman beramai-ramai' },
  { id: 'courier', Icon: Package, name: 'BALAJU Kurir', desc: 'Kirim barang cepat & aman' },
];

const TRUST: { Icon: LucideIcon; label: string }[] = [
  { Icon: MapPin, label: 'Lokal' },
  { Icon: Zap, label: 'Cepat' },
  { Icon: ShieldCheck, label: 'Aman' },
  { Icon: Wallet, label: 'Transparan' },
];

export function BalajuEntry() {
  const api = useApi();
  const router = useRouter();
  const { user } = useAuth();
  const [service, setService] = useState<ServiceType>('ride_bike');
  const [pickup, setPickup] = useState<BalajuPoint | null>(null);
  const [dropoff, setDropoff] = useState<BalajuPoint | null>(null);
  const [pickupNote, setPickupNote] = useState('');
  // resumed = draft kebaca dari sessionStorage (tampil ringkasan, sembunyikan picker).
  const [resumed, setResumed] = useState(false);

  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estLoading, setEstLoading] = useState(false);
  const [estErr, setEstErr] = useState<string | null>(null);

  const canContinue = pickup !== null && dropoff !== null;

  // Restore draft sekali pas mount (one-shot: baca lalu hapus, biar gak nge-haunt kunjungan berikut).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);
      const d = JSON.parse(raw) as OrderDraft;
      if (d?.pickup && d?.dropoff) {
        setService(d.service ?? 'ride_bike');
        setPickup(d.pickup);
        setDropoff(d.dropoff);
        setPickupNote(d.pickupNote ?? '');
        setEstimate(d.estimate ?? null);
        setResumed(true);
      }
    } catch {
      // draft korup -> abaikan, mulai bersih.
    }
  }, []);

  // Simpan draft sebelum lempar ke login (biar gak ilang pas balik).
  function saveDraft() {
    if (typeof window === 'undefined' || !pickup || !dropoff) return;
    const d: OrderDraft = { service, pickup, dropoff, pickupNote, estimate };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      // quota/private mode -> abaikan, fallback ke perilaku lama.
    }
  }

  // Breakdown layanan tertentu dari hasil estimate (null kalau belum hitung).
  function breakdownOf(svc: ServiceType): EstimateItem | null {
    return estimate?.estimates.find((e) => e.service_type === svc) ?? null;
  }

  // Harga yang RIDER bayar utk layanan tertentu (total_bayar). null kalau belum hitung.
  function fareOf(svc: ServiceType): number | null {
    return breakdownOf(svc)?.total_bayar ?? null;
  }

  // Tap "Lihat Harga" → panggil backend estimate (3 layanan sekaligus).
  async function handleEstimate() {
    if (!pickup || !dropoff) return;
    setEstLoading(true);
    setEstErr(null);
    try {
      const res = await api.post<EstimateResult>('/rides/estimate', {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
      });
      setEstimate(res);
    } catch (e: any) {
      setEstErr('Gagal menghitung harga. Coba lagi.');
    } finally {
      setEstLoading(false);
    }
  }

  // Kalau rute berubah, harga lama nggak valid lagi → reset.
  function resetEstimate() {
    if (estimate) setEstimate(null);
  }

  // Buka kembali picker (user mau ganti rute dari ringkasan resume).
  function editRoute() {
    setResumed(false);
    setEstimate(null);
  }

  const [ordering, setOrdering] = useState(false);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  // Tap "Pesan Sekarang":
  //  - belum login → simpan draft + arahkan ke /login (gerbang publik → Citizen), bukan error.
  //  - sudah login → POST /rides (bikin order) → redirect ke halaman status.
  async function handleOrder() {
    if (!pickup || !dropoff || ordering) return;

    // Gerbang Citizen: harga boleh diintip publik, tapi PESAN wajib login.
    if (!user) {
      saveDraft(); // <- selamatkan isian biar gak ilang pas balik dari login
      router.push('/login?redirect=/balaju/pesan');
      return;
    }

    setOrdering(true);
    setOrderErr(null);
    try {
      const res = await api.post<{ request: { id: string } }>('/rides', {
        service_type: service,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickup.name,
        dropoff_address: dropoff.name,
        service_details: pickupNote.trim() ? { pickup_note: pickupNote.trim() } : {},
      });
      const id = res?.request?.id;
      if (!id) throw new Error('no id');
      router.push(`/balaju/pesan/${id}`);
    } catch (e: any) {
      // Token kedaluwarsa di tengah (401/403) → simpan draft + arahkan login, bukan error generik.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        saveDraft();
        router.push('/login?redirect=/balaju/pesan');
        return;
      }
      setOrderErr('Gagal membuat pesanan. Coba lagi.');
      setOrdering(false);
    }
  }

  const selectedBreakdown = breakdownOf(service);
  const showSummary = resumed && pickup !== null && dropoff !== null;

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header brand */}
        <header className="mb-6">
          <div className="flex items-center gap-2.5">
            <span className="bl-shadow-soft grid h-10 w-10 place-items-center rounded-2xl bg-[var(--bl-forest)] text-white">
              <Bike className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <h1 className="bl-display text-xl font-extrabold text-[var(--bl-forest-d)]">BALAJU</h1>
              <p className="mt-0.5 text-xs text-[var(--bl-muted)]">Jalan Kita, Terhubung.</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--bl-line)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--bl-forest-d)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--bl-forest)]" /> Ternate
            </span>
          </div>
          {showSummary ? (
            <p className="mt-4 rounded-xl bg-[var(--bl-forest-10)] px-3 py-2 text-sm font-semibold text-[var(--bl-forest-d)]">
              Lanjutkan pesananmu — rute &amp; harga masih tersimpan.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-[var(--bl-muted)]">
              Ojek, kurir, dan mobil lokal Maluku Utara. Harga transparan, driver
              terdekat — cepat &amp; aman.
            </p>
          )}
        </header>

        {/* Trust badges */}
        <div className="mb-6 grid grid-cols-4 gap-2">
          {TRUST.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--bl-line)] bg-white py-3"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bl-forest-10)]">
                <Icon className="h-[18px] w-[18px] text-[var(--bl-forest)]" />
              </span>
              <span className="text-[11px] font-semibold text-[var(--bl-ink)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Pilih layanan */}
        <section className="mb-6">
          <h2 className="bl-display mb-3 text-sm font-bold uppercase tracking-wide text-[var(--bl-forest-d)]">Pilih Layanan</h2>
          <div className="space-y-2.5">
            {SERVICES.map((s) => {
              const active = service === s.id;
              const Icon = s.Icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setService(s.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? 'bl-shadow-soft border-[var(--bl-forest)] bg-[var(--bl-forest-10)]'
                      : 'border-[var(--bl-line)] bg-white hover:border-[var(--bl-forest-30)]'
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                      active ? 'bg-[var(--bl-forest)] text-white' : 'bg-[var(--bl-forest-10)] text-[var(--bl-forest)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[var(--bl-ink)]">{s.name}</span>
                    <span className="block text-xs text-[var(--bl-muted)]">{s.desc}</span>
                  </span>
                  {estLoading && fareOf(s.id) === null ? (
                    <span className="mr-1 inline-block h-4 w-14 animate-pulse rounded-full bg-[var(--bl-forest-10)]" />
                  ) : fareOf(s.id) !== null ? (
                    <span className="bl-display mr-1 text-sm font-extrabold text-[var(--bl-forest)]">
                      {rupiah(fareOf(s.id)!)}
                    </span>
                  ) : null}
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? 'border-[var(--bl-forest)] bg-[var(--bl-forest)]' : 'border-[var(--bl-line)]'
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Rute — RINGKASAN (kalau resume dari login) ATAU picker penuh */}
        <section className="mb-6">
          <h2 className="bl-display mb-3 text-sm font-bold uppercase tracking-wide text-[var(--bl-forest-d)]">Rute</h2>

          {showSummary ? (
            <div className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--bl-forest)]" />
                  <span className="my-1 h-8 w-px bg-[var(--bl-line)]" />
                  <MapPin className="h-4 w-4 text-[var(--bl-amber)]" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Jemput</div>
                    <div className="text-sm font-semibold text-[var(--bl-ink)]">{pickup?.name || 'Titik jemput'}</div>
                    {pickupNote.trim() && (
                      <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[var(--bl-forest-10)] px-2 py-1.5 text-[11px] text-[var(--bl-forest-d)]">
                        <MapPin className="mt-px h-3 w-3 shrink-0 text-[var(--bl-forest)]" />
                        <span className="min-w-0">{pickupNote.trim()}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
                    <div className="text-sm font-semibold text-[var(--bl-ink)]">{dropoff?.name || 'Tujuan'}</div>
                  </div>
                </div>
                <button
                  onClick={editRoute}
                  className="inline-flex h-fit shrink-0 items-center gap-1 rounded-lg border border-[var(--bl-line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bl-forest-d)] transition hover:border-[var(--bl-forest-30)]"
                >
                  <Pencil className="h-3 w-3" /> Ubah
                </button>
              </div>
            </div>
          ) : (
            <>
              <BalajuLocationStep
                onChange={({ pickup: p, dropoff: d }) => {
                  setPickup(p);
                  setDropoff(d);
                  resetEstimate();
                }}
                onReady={({ pickup: p, dropoff: d }) => {
                  setPickup(p);
                  setDropoff(d);
                }}
                onNoteChange={setPickupNote}
              />
              <p className="mt-2 text-[11px] text-[var(--bl-muted)]">
                Harga muncul setelah jemput &amp; tujuan dipilih.
              </p>
            </>
          )}
        </section>

        {/* FARE-V2: kartu transparansi — fee TeraLoka tampil TERPISAH (prinsip #2).
            Framing menang: "Driver terima X, platform Y" > "tarif X, driver cuma Z". */}
        {selectedBreakdown && (
          <section className="bl-shadow-soft mb-4 rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--bl-muted)]">
                Total bayar
                {estimate && (
                  <span className="font-medium text-[var(--bl-muted)]">
                    {' '}· ± {(estimate.distance_m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km
                  </span>
                )}
              </span>
              <span className="bl-display text-2xl font-extrabold text-[var(--bl-forest)]">
                {rupiah(selectedBreakdown.total_bayar)}
              </span>
            </div>
            <div className="mt-2 space-y-1 border-t border-dashed border-[var(--bl-line)] pt-2 text-[11px]">
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span className="flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5 text-[var(--bl-forest)]" /> Driver terima (utuh)
                </span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(selectedBreakdown.tarif_dasar)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--bl-muted)]">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[var(--bl-amber)]" /> Fee TeraLoka
                </span>
                <span className="font-semibold text-[var(--bl-ink)]">{rupiah(selectedBreakdown.komisi)}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[var(--bl-muted)]">
              Driver kamu menerima tarif penuh. Fee TeraLoka tampil terpisah &amp; transparan.
            </p>
          </section>
        )}

        {estErr && <p className="mb-2 text-center text-xs font-medium text-red-500">{estErr}</p>}
        {orderErr && <p className="mb-2 text-center text-xs font-medium text-red-500">{orderErr}</p>}

        {/* CTA — sebelum estimate: "Lihat Harga"; sesudah: "Pesan Sekarang" */}
        {estimate === null ? (
          <button
            onClick={handleEstimate}
            disabled={!canContinue || estLoading}
            className="bl-shadow-lift w-full rounded-2xl bg-[var(--bl-forest)] py-4 text-center text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {estLoading ? 'Menghitung harga...' : 'Lihat Harga'}
          </button>
        ) : (
          <button
            onClick={handleOrder}
            disabled={ordering}
            className="bl-shadow-lift w-full rounded-2xl bg-[var(--bl-forest)] py-4 text-center text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
          >
            {ordering
              ? 'Membuat pesanan...'
              : !user
                ? `Masuk untuk Pesan — ${(() => {
                    const f = fareOf(service);
                    return f !== null ? rupiah(f) : '';
                  })()}`
                : `Pesan Sekarang — ${(() => {
                    const f = fareOf(service);
                    return f !== null ? rupiah(f) : '';
                  })()}`}
          </button>
        )}

        {!user && estimate !== null && (
          <p className="mt-2 text-center text-[11px] text-[var(--bl-muted)]">
            Masuk dulu untuk memesan — harga di atas sudah final.
          </p>
        )}

        <p className="mt-4 text-center text-[11px] text-[var(--bl-muted)]">
          TeraLoka BALAJU · Maluku Utara
        </p>
      </div>
    </div>
  );
}
