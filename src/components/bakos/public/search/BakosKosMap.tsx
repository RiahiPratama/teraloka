'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Cari — Peta hasil pencarian (pin presisi per-kos BERBAYAR)
// PATH: src/components/bakos/public/search/BakosKosMap.tsx
// ────────────────────────────────────────────────────────────────
// C-PREMIUM-ONLY: cuma render kos yang punya koordinat (= berbayar/revealed,
//   BE gate). Kos free tak punya lat/lng → tak muncul (insentif upgrade).
// Marker = ikon RUMAH amber (#F59E0B, brand BAKOS) — pola sama KosDetailMap.
// Tap marker → kartu kos mini (reuse ListingCard) slide-up dari bawah.
// 🛡️ dynamic(ssr:false) dari pemanggil (Leaflet pecah di SSR).
// PENANDA: BKC-KOS-MAP
// ════════════════════════════════════════════════════════════════
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { type Listing } from '../bakos-links';
import { ListingCard } from '../listing-card';

const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TERNATE_CENTER: LatLngExpression = [0.79, 127.38];

// Pin rumah amber (brand BAKOS) — pola sama KosDetailMap (lingkaran + rumah putih).
function houseIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="bkc-pin">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-5h5v5"/>
      </svg></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

/* ─── fix Leaflet: container baru muncul (toggle) → size 0 → tiles gak render.
   invalidateSize setelah mount + sedikit delay. ─── */
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/* ─── marker layer (vanilla L via useMap) ─── */
function KosPinLayer({
  items, onPick,
}: { items: Listing[]; onPick: (k: Listing) => void }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    const valid = items.filter((k) => k.latitude != null && k.longitude != null);
    if (valid.length === 0) return;

    const group = L.layerGroup();
    for (const k of valid) {
      const marker = L.marker([k.latitude as number, k.longitude as number], { icon: houseIcon() });
      marker.bindTooltip(k.title, { direction: 'top', offset: [0, -20], className: 'bkc-pin-tip' });
      marker.on('click', () => onPick(k));
      group.addLayer(marker);
    }
    group.addTo(map);
    layerRef.current = group;
    // fit ke semua pin
    try {
      const bounds = L.latLngBounds(valid.map((k) => [k.latitude as number, k.longitude as number]));
      map.fitBounds(bounds.pad(0.3), { maxZoom: 15 });
    } catch { /* noop */ }

    return () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, items, onPick]);

  return null;
}

export function BakosKosMap({ items }: { items: Listing[] }) {
  const [picked, setPicked] = useState<Listing | null>(null);

  // 🛡️ height diatur via CSS .bkc-map-wrap (calc viewport) — JANGAN inline 100%
  //    (parent .bkc-mapview tak punya tinggi → 100% collapse → tiles tak render).
  return (
    <div className="bkc-map-wrap">
      <MapContainer
        center={TERNATE_CENTER} zoom={13} minZoom={11} maxZoom={18}
        scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE} attribution={ATTR} />
        <InvalidateOnMount />
        <KosPinLayer items={items} onPick={setPicked} />
      </MapContainer>

      {/* kartu kos mini (tap marker) — reuse ListingCard */}
      {picked && (
        <div className="bkc-map-card" role="dialog" aria-label={picked.title}>
          <button className="bkc-map-card-x" onClick={() => setPicked(null)} aria-label="Tutup">
            <span className="material-symbols-outlined">close</span>
          </button>
          <ListingCard item={picked} />
        </div>
      )}
    </div>
  );
}
