'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Cara Pakai (.steps). Port 1:1 mockup. Statis.
// PATH: src/components/balaundry/public/cara-pakai-section.tsx
// ════════════════════════════════════════════════════════════════

import { Reveal } from './reveal';

const STEPS = [
  { n: '1', h: 'Cari laundry', p: 'Temukan laundry terdekat & terverifikasi di kotamu.' },
  { n: '2', h: 'Bandingkan', p: 'Lihat layanan, harga, dan ulasan jujur pelanggan lain.' },
  { n: '3', h: 'Pesan via WA', p: 'Hubungi laundry langsung lewat WhatsApp, tanpa perantara.' },
  { n: '4', h: 'Lacak pesanan', p: 'Pantau status cucianmu cukup dengan kode pesanan.' },
];

export function CaraPakaiSection() {
  return (
    <section><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">touch_app</span> Mudah</span>
        <h2>Cara Menggunakan BALAUNDRY</h2>
        <p>Empat langkah, cucian beres tanpa antre.</p>
      </Reveal>
      <div className="steps">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i === 0 ? undefined : (i as 1 | 2 | 3)}>
            <div className="stp">
              <div className="n">{s.n}</div>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div></section>
  );
}
