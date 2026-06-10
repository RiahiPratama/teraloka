'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — KosMapPicker (wrapper, SSR-safe)
// PATH: src/components/bakos/owner/KosMapPicker.tsx
// PENANDA: L5-FE-KOS-MAP
// ────────────────────────────────────────────────────────────────
// Wrapper controlled untuk pilih titik presisi kos (opsional, fitur berbayar).
//   value={{lat,lng}|null}  onChange({lat,lng})
// dynamic(ssr:false) → inner Leaflet aman. + tombol GPS "Pakai lokasi saya".
// 🛡️ Lat/long presisi = PII; backend hanya tampilkan ke publik berbayar
//    (redactKosDetail). Di form ini sekadar input.
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Crosshair, X, Loader2 } from 'lucide-react';
import type { LatLng } from './KosMapPickerInner';
import { BAKOS_TOKENS } from './types';

const BRAND = BAKOS_TOKENS.accent;
const TERNATE: LatLng = { lat: 0.7905, lng: 127.3846 }; // default center kota Ternate

const Inner = dynamic(() => import('./KosMapPickerInner'), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl flex items-center justify-center" style={{ background: '#EDEAE1' }}><Loader2 size={18} className="animate-spin" style={{ color: BRAND }} /></div>,
});

export default function KosMapPicker({
  value, onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
}) {
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const center = value ?? TERNATE;

  function useGps() {
    if (!('geolocation' in navigator)) { setGpsErr('GPS tidak tersedia di perangkat ini.'); return; }
    setGpsBusy(true); setGpsErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsBusy(false); },
      () => { setGpsErr('Gagal ambil lokasi. Izinkan akses lokasi atau tap di peta.'); setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={useGps} disabled={gpsBusy}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border active:scale-95 transition-transform disabled:opacity-50"
          style={{ borderColor: BAKOS_TOKENS.border, color: BRAND, background: BAKOS_TOKENS.accentBg }}>
          {gpsBusy ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />} Pakai lokasi saya
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-xs px-2 py-2" style={{ color: BAKOS_TOKENS.textSecondary }}>
            <X size={13} /> Hapus pin
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: BAKOS_TOKENS.border }}>
        <Inner center={center} marker={value} onPick={onChange} height={220} />
      </div>

      <p className="mt-1.5 text-[11px] flex items-center gap-1" style={{ color: BAKOS_TOKENS.textTertiary }}>
        <MapPin size={11} />
        {value
          ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} — geser pin atau tap peta untuk menyesuaikan`
          : 'Tap di peta atau pakai GPS untuk tandai titik kos (opsional).'}
      </p>
      {gpsErr && <p className="mt-1 text-[11px] text-red-600">{gpsErr}</p>}
      <p className="mt-1 text-[11px]" style={{ color: BAKOS_TOKENS.textTertiary }}>
        🔒 Titik presisi hanya tampil ke publik setelah kamu berlangganan.
      </p>
    </div>
  );
}
