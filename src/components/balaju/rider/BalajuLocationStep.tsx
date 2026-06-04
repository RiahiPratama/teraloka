'use client';

/**
 * TeraLoka — BalajuLocationStep (F7-1b-ii)
 * ============================================================
 * Pilih 2 titik (jemput + tujuan) buat order BALAJU.
 * Gabungan 3 cara pilih lokasi, semua DEFENSIF & independen:
 *   1. Tap/geser pin di peta (Cara A — sumber kebenaran koordinat)
 *   2. GPS "Pakai lokasi saya" (Cara B) — handle ditolak gracefully
 *   3. Autocomplete ketik nama (Cara B) — pakai useLocationSearch,
 *      ambil koordinat dari Location.latitude/longitude
 *
 * Reverse-geo (koordinat → nama kelurahan) on-pick. Handle null:
 *   kalau backend balikin null, koordinat tetap kepakai, nama fallback.
 *
 * Output: onReady({ pickup, dropoff }) tiap dua titik lengkap →
 *   parent (BalajuEntry) lanjut ke hitung harga (F7-2).
 *
 * Map = sumber kebenaran: autocomplete/GPS cuma geser peta + set pin,
 *   rider selalu bisa koreksi via tap/geser. Centroid kelurahan bukan
 *   titik presisi — geser pin buat akurasi.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { BalajuMapPicker, type LatLng } from './BalajuMapPicker';
import { useReverseGeo } from '@/components/shared/locations/use-locations';
import { useLocationSearch } from '@/components/shared/locations/use-locations';
import type { Location } from '@/components/shared/locations/locations-types';

const BRAND = '#1B6B4A';
const ACCENT = '#F59E0B';
const TERNATE: LatLng = { lat: 0.7903, lng: 127.3861 };

export interface BalajuPoint {
  lat: number;
  lng: number;
  name: string; // nama kelurahan (reverse-geo) atau pilihan autocomplete
}

type Which = 'pickup' | 'dropoff';

export interface BalajuLocationStepProps {
  onReady: (pts: { pickup: BalajuPoint; dropoff: BalajuPoint }) => void;
  onChange?: (pts: { pickup: BalajuPoint | null; dropoff: BalajuPoint | null }) => void;
}

export function BalajuLocationStep({ onReady, onChange }: BalajuLocationStepProps) {
  const [which, setWhich] = useState<Which>('pickup');
  const [pickup, setPickup] = useState<BalajuPoint | null>(null);
  const [dropoff, setDropoff] = useState<BalajuPoint | null>(null);
  const [center, setCenter] = useState<LatLng>(TERNATE);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);

  const reverseGeo = useReverseGeo();

  // Titik aktif (yang lagi diatur)
  const active = which === 'pickup' ? pickup : dropoff;
  const setActive = (p: BalajuPoint | null) =>
    which === 'pickup' ? setPickup(p) : setDropoff(p);

  // Lapor perubahan ke parent + auto-ready kalau dua-duanya lengkap
  useEffect(() => {
    onChange?.({ pickup, dropoff });
    if (pickup && dropoff) onReady({ pickup, dropoff });
  }, [pickup, dropoff]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pick dari peta (tap / geser pin) → set koordinat dulu, reverse-geo nama ──
  async function handlePick(coord: LatLng) {
    // Set koordinat duluan (nama nyusul) — biar responsif walau reverse-geo lambat/null
    setActive({ lat: coord.lat, lng: coord.lng, name: 'Titik dipilih' });
    try {
      const res = await reverseGeo.execute(coord.lat, coord.lng);
      const name =
        res?.name && res?.parent_breadcrumb
          ? `${res.name}, ${res.parent_breadcrumb}`
          : res?.name ?? 'Titik dipilih (dari peta)';
      setActive({ lat: coord.lat, lng: coord.lng, name });
    } catch {
      // reverse-geo gagal/null → koordinat tetap kepakai, nama fallback. Jangan crash.
      setActive({ lat: coord.lat, lng: coord.lng, name: 'Titik dipilih (dari peta)' });
    }
  }

  // ── GPS "Pakai lokasi saya" ── (handle ditolak / nggak didukung gracefully)
  function handleGps() {
    setGpsErr(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsErr('Perangkat tidak mendukung lokasi GPS.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coord); // geser peta ke posisi rider
        handlePick(coord); // set titik aktif + reverse-geo
      },
      () => {
        setGpsBusy(false);
        setGpsErr('Tidak bisa ambil lokasi. Izinkan akses lokasi atau pilih lewat peta.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      {/* Toggle: lagi atur Jemput / Tujuan */}
      <div className="mb-2 flex gap-2">
        {(['pickup', 'dropoff'] as Which[]).map((w) => {
          const on = which === w;
          const pt = w === 'pickup' ? pickup : dropoff;
          const dot = w === 'pickup' ? BRAND : ACCENT;
          return (
            <button
              key={w}
              onClick={() => setWhich(w)}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-xs transition ${
                on ? 'border-transparent' : 'border-gray-200 bg-white'
              }`}
              style={on ? { backgroundColor: '#F0F7F4', borderColor: dot } : undefined}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />
                <span className="font-semibold text-gray-700">
                  {w === 'pickup' ? 'Titik Jemput' : 'Tujuan'}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                {pt ? pt.name : 'Belum dipilih'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Autocomplete cari area (set titik aktif) */}
      <LocationSearchBox
        key={which} // reset input pas ganti titik
        placeholder={`Cari area ${which === 'pickup' ? 'jemput' : 'tujuan'}...`}
        onSelect={(loc) => {
          if (loc.latitude != null && loc.longitude != null) {
            const coord = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
            setCenter(coord);
            setActive({ ...coord, name: loc.name });
          } else {
            // Koordinat null → geser peta seadanya, minta rider tap pastiin
            setActive(null);
            setGpsErr(`"${loc.name}" belum ada koordinat — tap peta buat pastiin titik.`);
          }
        }}
      />

      {/* GPS + status */}
      <div className="mb-2 mt-2 flex items-center gap-2">
        <button
          onClick={handleGps}
          disabled={gpsBusy}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          <span>📍</span>
          {gpsBusy ? 'Mengambil lokasi...' : 'Pakai lokasi saya'}
        </button>
        <span className="text-[11px] text-gray-400">
          atau tap / geser pin di peta
        </span>
      </div>
      {gpsErr && <p className="mb-2 text-[11px] text-amber-600">{gpsErr}</p>}

      {/* Peta — pin = titik aktif */}
      <BalajuMapPicker
        center={center}
        marker={active ? { lat: active.lat, lng: active.lng } : null}
        onPick={handlePick}
        height={280}
      />

      {/* Ringkasan 2 titik */}
      <div className="mt-3 space-y-1.5">
        <PointRow color={BRAND} label="Jemput" point={pickup} />
        <PointRow color={ACCENT} label="Tujuan" point={dropoff} />
      </div>
    </div>
  );
}

// ── Baris ringkasan titik ──
function PointRow({
  color,
  label,
  point,
}: {
  color: string;
  label: string;
  point: BalajuPoint | null;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="shrink-0 font-medium text-gray-600">{label}:</span>
      <span className="truncate text-gray-500">{point ? point.name : 'belum dipilih'}</span>
    </div>
  );
}

// ── Autocomplete box pakai useLocationSearch (bukan LocationAutocomplete,
//    karena kita butuh objek Location penuh termasuk koordinat) ──
function LocationSearchBox({
  placeholder,
  onSelect,
}: {
  placeholder: string;
  onSelect: (loc: Location) => void;
}) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // useLocationSearch debounce 300ms internal (min 2 char)
  const { data: results, loading } = useLocationSearch(term);

  // Outside click close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const list = useMemo(() => (Array.isArray(results) ? results.slice(0, 8) : []), [results]);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => term.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
      />
      {open && term.length >= 2 && (
        <div className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Mencari...</div>}
          {!loading && list.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">Tidak ditemukan</div>
          )}
          {list.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                onSelect(loc);
                setTerm(loc.name);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">{loc.name}</span>
              <span className="ml-1.5 text-[11px] text-gray-400">{loc.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
