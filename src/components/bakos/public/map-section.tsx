'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Map teaser (public LP) — SLIM
// PATH: src/components/bakos/public/map-section.tsx
// 🛡️ Bukan peta beneran. Teaser ramping & intentional (bukan blob raksasa).
//    Leaflet (pola balapor) di-wire nanti. Kota = chip, belum link.
// ════════════════════════════════════════════════════════════════

const KOTA = ['Ternate', 'Tidore', 'Sofifi', 'Tobelo'];

export function MapSection() {
  return (
    <section className="bk-sec bk-pt0"><div className="bk-wrap">
      <div className="bk-mapteaser">
        <span className="grid-bg" />
        <span className="ic"><span className="material-symbols-outlined">map</span></span>
        <div className="tx">
          <b>Peta sebaran kos</b>
          <span>Lihat kos per lokasi di peta interaktif — <em>segera hadir</em></span>
        </div>
        <div className="kota">
          {KOTA.map((k) => <span key={k} className="chip"><span className="material-symbols-outlined">location_on</span>{k}</span>)}
        </div>
      </div>
    </div></section>
  );
}
