'use client';

/**
 * TeraLoka — BalajuMapPicker (Wrapper, SSR-safe)
 * F7-1b-i (5 Jun 2026)
 * ------------------------------------------------------------
 * Wrapper thin yang dynamically import komponen Leaflet picker.
 * Leaflet butuh `window` — TIDAK SSR-safe. Pola mirror balapor-map.tsx:
 * split wrapper + inner, inner di-load via dynamic(..., {ssr:false}).
 *
 * Use-case beda dari BalaporMap: ini PICK 1 titik (tap/geser pin →
 * koordinat keluar via onPick), bukan nampilin banyak marker read-only.
 *
 * Contoh:
 *   <BalajuMapPicker
 *     center={{ lat: 0.79, lng: 127.38 }}
 *     marker={pickup}
 *     onPick={(c) => setPickup(c)}
 *     height={260}
 *   />
 */

import dynamic from 'next/dynamic';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BalajuMapPickerProps {
  /** Pusat peta awal (default: Ternate kota). */
  center?: LatLng;
  /** Posisi pin sekarang (null = belum dipilih). */
  marker?: LatLng | null;
  /** Dipanggil tiap pin pindah (tap peta / geser pin). */
  onPick: (coord: LatLng) => void;
  /** Tinggi peta (px). Default 260. */
  height?: number;
}

const TERNATE: LatLng = { lat: 0.7903, lng: 127.3861 };

const LeafletPicker = dynamic(
  () => import('./BalajuMapPickerLeaflet').then((m) => m.BalajuMapPickerLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse rounded-xl border border-gray-200 bg-gray-100"
        style={{ height: 260 }}
      />
    ),
  },
);

export function BalajuMapPicker({
  center = TERNATE,
  marker = null,
  onPick,
  height = 260,
}: BalajuMapPickerProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200">
      <LeafletPicker center={center} marker={marker} onPick={onPick} height={height} />
    </div>
  );
}
