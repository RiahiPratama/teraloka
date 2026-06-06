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
 *
 * Visual: design-system bl- (var --bl-* di-scope dari .bl-landing parent
 *   di BalajuEntry). Ikon lucide.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, LocateFixed, Check } from 'lucide-react';
import { BalajuMapPicker, type LatLng } from './BalajuMapPicker';
import { useReverseGeo } from '@/components/shared/locations/use-locations';
import { useLocationSearch } from '@/components/shared/locations/use-locations';
import type { Location, ReverseGeoResult } from '@/components/shared/locations/locations-types';

const BRAND = '#1B6B4A';
const ACCENT = '#F59E0B';
const TERNATE: LatLng = { lat: 0.7903, lng: 127.3861 };

// Ringkas nama lokasi dari reverse-geo: "<kelurahan>, <kota/kabupaten>".
// parent_breadcrumb urutannya "Provinsi › Kota/Kab › Kecamatan › Kelurahan".
// JEBAKAN: kecamatan Ternate ("Kota Ternate Utara") juga diawali "Kota" — makanya
// ambil segmen PERTAMA yang diawali Kota/Kabupaten (kota selalu sebelum kecamatan).
function shortPlace(res: ReverseGeoResult | null | undefined): string | null {
  const kelurahan = res?.name?.trim();
  if (!kelurahan) return null;
  const segments = (res?.parent_breadcrumb ?? '')
    .split(/\s*›\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const kota = segments.find((s) => /^(kota|kabupaten|kab\.?)\b/i.test(s));
  if (kota && kota.toLowerCase() !== kelurahan.toLowerCase()) {
    return `${kelurahan}, ${kota}`;
  }
  return kelurahan;
}

export interface BalajuPoint {
  lat: number;
  lng: number;
  name: string; // nama kelurahan (reverse-geo) atau pilihan autocomplete
}

type Which = 'pickup' | 'dropoff';

export interface BalajuLocationStepProps {
  onReady: (pts: { pickup: BalajuPoint; dropoff: BalajuPoint }) => void;
  onChange?: (pts: { pickup: BalajuPoint | null; dropoff: BalajuPoint | null }) => void;
  onNoteChange?: (note: string) => void;
}

export function BalajuLocationStep({ onReady, onChange, onNoteChange }: BalajuLocationStepProps) {
  const [which, setWhich] = useState<Which>('pickup');
  const [pickup, setPickup] = useState<BalajuPoint | null>(null);
  const [dropoff, setDropoff] = useState<BalajuPoint | null>(null);
  const [center, setCenter] = useState<LatLng>(TERNATE);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [pickupNote, setPickupNote] = useState('');

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
      const name = shortPlace(res) ?? 'Titik dipilih (dari peta)';
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
      <div className="mb-2.5 flex gap-2">
        {(['pickup', 'dropoff'] as Which[]).map((w) => {
          const on = which === w;
          const pt = w === 'pickup' ? pickup : dropoff;
          const dot = w === 'pickup' ? BRAND : ACCENT;
          return (
            <button
              key={w}
              onClick={() => setWhich(w)}
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-left transition ${
                on ? 'bl-shadow-soft' : 'border-[var(--bl-line)] bg-white'
              }`}
              style={on ? { backgroundColor: 'var(--bl-forest-10)', borderColor: dot } : undefined}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                <span className="text-xs font-bold text-[var(--bl-ink)]">
                  {w === 'pickup' ? 'Titik Jemput' : 'Tujuan'}
                </span>
              </span>
              <span className="mt-1 flex items-center gap-1 text-[11px]">
                {pt ? (
                  <>
                    <Check className="h-3 w-3 shrink-0" style={{ color: dot }} />
                    <span className="font-semibold" style={{ color: dot }}>Sudah dipilih</span>
                  </>
                ) : (
                  <span className="text-[var(--bl-muted)]">Belum dipilih</span>
                )}
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
      <div className="mb-2.5 mt-2.5 flex items-center gap-2.5">
        <button
          onClick={handleGps}
          disabled={gpsBusy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--bl-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--bl-ink)] transition hover:border-[var(--bl-forest-30)] disabled:opacity-50"
        >
          <LocateFixed className="h-4 w-4 text-[var(--bl-forest)]" />
          {gpsBusy ? 'Mengambil lokasi...' : 'Pakai lokasi saya'}
        </button>
        <span className="text-[11px] text-[var(--bl-muted)]">
          atau tap / geser pin di peta
        </span>
      </div>
      {gpsErr && <p className="mb-2 text-[11px] font-medium text-[var(--bl-amber)]">{gpsErr}</p>}

      {/* Peta — pin = titik aktif */}
      <div className="bl-shadow-soft overflow-hidden rounded-2xl border border-[var(--bl-line)]">
        <BalajuMapPicker
          center={center}
          marker={active ? { lat: active.lat, lng: active.lng } : null}
          onPick={handlePick}
          height={280}
        />
      </div>

      {/* Ringkasan 2 titik — nama lengkap muncul DI SINI (bukan di pil atas) */}
      <div className="mt-3 rounded-2xl border border-[var(--bl-line)] bg-white p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Rute terpilih</div>
        <div className="space-y-2">
          <PointRow color={BRAND} label="Jemput" point={pickup} />
          <PointRow color={ACCENT} label="Tujuan" point={dropoff} />
        </div>
      </div>

      {/* Catatan jemput (opsional) — kompensasi nama kelurahan reverse-geo yang bisa meleset.
          GPS akurat, tapi patokan bantu driver nemu titik persisnya. */}
      <div className="mt-3">
        <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--bl-ink)]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
          Catatan jemput <span className="font-medium text-[var(--bl-muted)]">(opsional)</span>
        </label>
        <textarea
          value={pickupNote}
          onChange={(e) => {
            const v = e.target.value.slice(0, 160);
            setPickupNote(v);
            onNoteChange?.(v);
          }}
          rows={2}
          placeholder="Patokan biar driver gampang nemu — cth: depan Masjid Raya, rumah pagar hijau, sebelah warung kopi."
          className="w-full resize-none rounded-xl border border-[var(--bl-line)] bg-white px-3 py-2.5 text-sm text-[var(--bl-ink)] outline-none transition placeholder:text-[var(--bl-muted)] focus:border-[var(--bl-forest)]"
        />
        <div className="mt-0.5 text-right text-[10px] text-[var(--bl-muted)]">{pickupNote.length}/160</div>
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
    <div className="flex gap-2 text-xs">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="shrink-0 font-bold text-[var(--bl-ink)]">{label}:</span>
      <span className="min-w-0 flex-1 text-[var(--bl-muted)]">{point ? point.name : 'belum dipilih'}</span>
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bl-muted)]" />
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => term.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--bl-line)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--bl-ink)] outline-none transition placeholder:text-[var(--bl-muted)] focus:border-[var(--bl-forest)]"
      />
      {open && term.length >= 2 && (
        <div className="bl-shadow-lift absolute z-[1000] mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-[var(--bl-line)] bg-white">
          {loading && <div className="px-3 py-2 text-xs text-[var(--bl-muted)]">Mencari...</div>}
          {!loading && list.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--bl-muted)]">Tidak ditemukan</div>
          )}
          {list.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                onSelect(loc);
                setTerm(loc.name);
                setOpen(false);
              }}
              className="block w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bl-forest-10)]"
            >
              <span className="font-semibold text-[var(--bl-ink)]">{loc.name}</span>
              <span className="ml-1.5 text-[11px] text-[var(--bl-muted)]">{loc.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
