'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Owner CTA Section (public LP)
// PATH: src/components/bakos/public/owner-cta-section.tsx
// 🛡️ Faktual untuk solo founder: no "tim datang", no "gratis", no komisi.
//    Jual ALAT kelola + audiens BAKABAR. Langganan Basic/Pro (revenue 4303).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';

export function OwnerCtaSection() {
  return (
    <section className="bk-sec bk-pt0"><div className="bk-wrap"><div className="bk-octa">
      <div className="blob" />
      <div className="bk-ol">
        <span className="bk-opill"><span className="material-symbols-outlined">home</span> Untuk pemilik kos</span>
        <h2>Punya kos? Kelola lebih mudah, <span>sewa tetap 100% milik Anda.</span></h2>
        <p>Daftarkan kos kamu, kelola penghuni &amp; tagihan dari HP, dan tampil di hadapan pembaca BAKABAR. BAKOS tidak memegang uang sewa dan tidak ambil komisi — kami sediakan alat kelolanya.</p>
        <ul>
          <li><span className="material-symbols-outlined">smartphone</span> Kelola dari HP, kapan saja</li>
          <li><span className="material-symbols-outlined">block</span> Tanpa komisi sewa</li>
          <li><span className="material-symbols-outlined">dashboard</span> Catat penghuni, tagihan, pengingat</li>
          <li><span className="material-symbols-outlined">campaign</span> Tampil lewat BAKABAR</li>
        </ul>
      </div>
      <div className="bk-or">
        <Link className="bk-octa-btn" href="/owner/bakos">
          Daftarkan kos saya <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div className="bk-onote">Pilih paket Basic atau Pro sesuai skala kos</div>
      </div>
    </div></div></section>
  );
}
