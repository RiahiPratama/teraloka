'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Map Section (public LP)
// PATH: src/components/bakos/public/map-section.tsx
// 🛡️ Placeholder "segera" — geocoding (lat/long) belum dirender.
//    Decorative island MalUt + Gamalama. Wire Leaflet (pola balapor) nanti.
// ════════════════════════════════════════════════════════════════

export function MapSection() {
  return (
    <section className="bk-sec bk-pt0"><div className="bk-wrap">
      <div className="bk-sh">
        <div>
          <h2>Peta kos di Ternate</h2>
          <p>Lihat sebaran kos per area</p>
        </div>
      </div>
      <div className="bk-mapwrap"><div className="bk-mapcanvas">
        <div className="bk-island" />
        <div className="bk-vol"><span className="material-symbols-outlined">landscape</span></div>
        <div className="bk-soon">
          <span className="material-symbols-outlined">map</span>
          <span>Peta interaktif</span>
          <em>segera — pin per lokasi kos</em>
        </div>
      </div></div>
    </div></section>
  );
}
