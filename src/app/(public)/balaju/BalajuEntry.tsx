'use client';

// src/app/(public)/balaju/BalajuEntry.tsx
// F7-1a — Entry shell BALAJU rider (STATIS dulu; peta + order di F7-1b/F7-2).
// Konsisten gaya TeraLoka: #1B6B4A primary, aksen #F59E0B, Tailwind, mobile-first.
//
// Yang ada di F7-1a:
//   - Header brand BALAJU + tagline
//   - 4 trust badge (lokal, cepat, aman, transparan)
//   - Pilih layanan (Ojek / Mobil / Kurir) — state lokal, belum panggil backend
//   - Input jemput/tujuan (placeholder statis — peta F7-1b)
//   - CTA "Lanjut" (disabled sampai lengkap — wiring F7-2)
//
// Belum: peta, reverse-geo, hitung harga, buat order, auth-gate.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BalajuLocationStep, type BalajuPoint } from '@/components/balaju/rider/BalajuLocationStep';
import { useApi } from '@/lib/api/client';

const BRAND = '#1B6B4A';

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

type ServiceType = 'ride_bike' | 'ride_car' | 'courier';

interface EstimateItem {
  service_type: ServiceType;
  fare: number;
}
interface EstimateResult {
  distance_m: number;
  estimates: EstimateItem[];
}

const SERVICES: {
  id: ServiceType;
  emoji: string;
  name: string;
  desc: string;
}[] = [
  { id: 'ride_bike', emoji: '🛵', name: 'BALAJU Ojek', desc: 'Ojek cepat & hemat' },
  { id: 'ride_car', emoji: '🚗', name: 'BALAJU Mobil', desc: 'Nyaman beramai-ramai' },
  { id: 'courier', emoji: '📦', name: 'BALAJU Kurir', desc: 'Kirim barang cepat & aman' },
];

const TRUST = [
  { emoji: '📍', label: 'Lokal' },
  { emoji: '⚡', label: 'Cepat' },
  { emoji: '🛡️', label: 'Aman' },
  { emoji: '💰', label: 'Transparan' },
];

export function BalajuEntry() {
  const api = useApi();
  const router = useRouter();
  const [service, setService] = useState<ServiceType>('ride_bike');
  const [pickup, setPickup] = useState<BalajuPoint | null>(null);
  const [dropoff, setDropoff] = useState<BalajuPoint | null>(null);

  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estLoading, setEstLoading] = useState(false);
  const [estErr, setEstErr] = useState<string | null>(null);

  const canContinue = pickup !== null && dropoff !== null;

  // Harga layanan tertentu dari hasil estimate (null kalau belum hitung).
  function fareOf(svc: ServiceType): number | null {
    const hit = estimate?.estimates.find((e) => e.service_type === svc);
    return hit ? hit.fare : null;
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

  const [ordering, setOrdering] = useState(false);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  // Tap "Pesan Sekarang" → POST /rides (bikin order) → redirect ke halaman status.
  async function handleOrder() {
    if (!pickup || !dropoff || ordering) return;
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
      });
      const id = res?.request?.id;
      if (!id) throw new Error('no id');
      router.push(`/balaju/pesan/${id}`);
    } catch (e: any) {
      setOrderErr('Gagal membuat pesanan. Coba lagi.');
      setOrdering(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      {/* Header brand */}
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-lg font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            B
          </span>
          <div>
            <h1 className="text-xl font-bold leading-none" style={{ color: BRAND }}>
              BALAJU
            </h1>
            <p className="text-xs text-gray-500">Jalan Kita, Terhubung.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Ojek, kurir, dan mobil lokal Maluku Utara. Harga transparan, driver
          terdekat — cepat &amp; aman.
        </p>
      </header>

      {/* Trust badges */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        {TRUST.map((t) => (
          <div
            key={t.label}
            className="rounded-xl bg-gray-50 py-2 text-center"
          >
            <div className="text-lg">{t.emoji}</div>
            <div className="mt-0.5 text-[11px] text-gray-600">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Pilih layanan */}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Pilih Layanan</h2>
        <div className="space-y-2">
          {SERVICES.map((s) => {
            const active = service === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setService(s.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-transparent'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                style={active ? { backgroundColor: '#F0F7F4', borderColor: BRAND } : undefined}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 text-xl">
                  {s.emoji}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-gray-900">{s.name}</span>
                  <span className="block text-xs text-gray-500">{s.desc}</span>
                </span>
                {fareOf(s.id) !== null && (
                  <span className="mr-1 text-sm font-bold" style={{ color: BRAND }}>
                    {rupiah(fareOf(s.id)!)}
                  </span>
                )}
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                    active ? '' : 'border-gray-300'
                  }`}
                  style={active ? { borderColor: BRAND, backgroundColor: BRAND } : undefined}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rute — pilih jemput + tujuan (peta + GPS + autocomplete) */}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Rute</h2>
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
        />
        <p className="mt-2 text-[11px] text-gray-400">
          Harga muncul setelah jemput &amp; tujuan dipilih.
        </p>
      </section>

      {estErr && <p className="mb-2 text-center text-xs text-red-500">{estErr}</p>}
      {orderErr && <p className="mb-2 text-center text-xs text-red-500">{orderErr}</p>}

      {/* CTA — sebelum estimate: "Lihat Harga"; sesudah: "Pesan Sekarang" */}
      {estimate === null ? (
        <button
          onClick={handleEstimate}
          disabled={!canContinue || estLoading}
          className="w-full rounded-xl py-3.5 text-center text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: BRAND }}
        >
          {estLoading ? 'Menghitung harga...' : 'Lihat Harga'}
        </button>
      ) : (
        <button
          onClick={handleOrder}
          disabled={ordering}
          className="w-full rounded-xl py-3.5 text-center text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ backgroundColor: BRAND }}
        >
          {ordering
            ? 'Membuat pesanan...'
            : `Pesan Sekarang — ${(() => {
                const f = fareOf(service);
                return f !== null ? rupiah(f) : '';
              })()}`}
        </button>
      )}

      <p className="mt-3 text-center text-[11px] text-gray-400">
        TeraLoka BALAJU · Maluku Utara
      </p>
    </div>
  );
}
