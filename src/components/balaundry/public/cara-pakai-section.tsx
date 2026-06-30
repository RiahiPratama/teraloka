'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Cara Pakai (.steps). Timeline + alur animasi. Statis.
// PATH: src/components/balaundry/public/cara-pakai-section.tsx
// Mobile: horizontal (angka kiri + teks kanan) + garis urut 1→4.
// Desktop: 4-kolom + connector line horizontal.
// Animasi: stagger reveal per step + garis konektor "kebentuk" (scaleY/X).
// ════════════════════════════════════════════════════════════════

import { Reveal } from './reveal';

const STEPS = [
  { n: '1', icon: 'search', h: 'Cari laundry', p: 'Temukan laundry terdekat & terverifikasi di kotamu.' },
  { n: '2', icon: 'balance', h: 'Bandingkan', p: 'Lihat layanan, harga, dan ulasan jujur pelanggan lain.' },
  { n: '3', icon: 'chat', h: 'Pesan via WA', p: 'Hubungi laundry langsung lewat WhatsApp, tanpa perantara.' },
  { n: '4', icon: 'local_shipping', h: 'Lacak pesanan', p: 'Pantau status cucianmu cukup dengan kode pesanan.' },
];

export function CaraPakaiSection() {
  return (
    <section><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">touch_app</span> Mudah</span>
        <h2>Cara Menggunakan BALAUNDRY</h2>
        <p>Empat langkah, cucian beres tanpa antre.</p>
      </Reveal>

      {/* bl-flow: timeline. .bl-flow-line = garis urut (kebentuk pas in-view). */}
      <Reveal className="bl-flow">
        <div className="bl-flow-line" aria-hidden="true" />
        {STEPS.map((s, i) => (
          <div
            className="bl-step"
            key={s.n}
            style={{ ['--i' as string]: i }}
          >
            <div className="bl-step-num">
              <span>{s.n}</span>
            </div>
            <div className="bl-step-body">
              <h4>
                <span className="material-symbols-outlined">{s.icon}</span>
                {s.h}
              </h4>
              <p>{s.p}</p>
            </div>
          </div>
        ))}
      </Reveal>
    </div></section>
  );
}
