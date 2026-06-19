'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Kenapa Section (public LP)
// PATH: src/components/bakos/public/kenapa-section.tsx
// 🛡️ Diferensiasi JUJUR untuk solo founder: distribusi BAKABAR + kontak
//    langsung + paham geografi MalUt. TIDAK ada klaim "tim datang".
// ════════════════════════════════════════════════════════════════

export function KenapaSection() {
  return (
    <section className="bk-sec"><div className="bk-wrap"><div className="bk-why">
      <span className="bk-wpill"><span className="material-symbols-outlined">circle</span> Kenapa BAKOS?</span>
      <h2>Dibangun khusus untuk Maluku Utara, bukan sekadar Mamikos versi kecil.</h2>

      <div className="bk-why-grid">
        <div className="bk-wc">
          <span className="bk-wic" style={{ background: 'var(--bk-green)' }}>
            <span className="material-symbols-outlined">campaign</span>
          </span>
          <h3>Dilihat lewat BAKABAR</h3>
          <p>Kos kamu tampil di hadapan pembaca berita lokal TeraLoka — bukan nyangkut di app sepi tanpa pengunjung.</p>
        </div>

        <div className="bk-wc">
          <span className="bk-wic" style={{ background: 'var(--bk-amber)' }}>
            <span className="material-symbols-outlined">chat</span>
          </span>
          <h3>Pemilik responsif</h3>
          <p>Hubungi ibu/bapak kos langsung lewat WhatsApp. Nomor diteruskan aman, tanpa calo, tanpa perantara.</p>
        </div>

        <div className="bk-wc">
          <span className="bk-wex">Eksklusif</span>
          <span className="bk-wic" style={{ background: 'var(--bk-purple)' }}>
            <span className="material-symbols-outlined">sailing</span>
          </span>
          <h3>Paham geografi Maluku Utara</h3>
          <p>Cari kos dekat kampus, pelabuhan, atau rute speedboat. Mudik ke Sofifi/Tobelo? Pilih kos dekat dermaga.</p>
        </div>
      </div>
    </div></div></section>
  );
}
