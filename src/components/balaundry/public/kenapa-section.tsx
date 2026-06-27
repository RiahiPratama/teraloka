'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Kenapa (.why). Port 1:1 mockup. Statis. Material Symbols.
// PATH: src/components/balaundry/public/kenapa-section.tsx
// ════════════════════════════════════════════════════════════════

import { Reveal } from './reveal';

const VALUES = [
  { icon: 'verified_user', h: 'Terverifikasi', p: 'Setiap laundry diverifikasi tim TeraLoka sebelum tampil. Profil & rating jujur, bukan iklan berbayar.' },
  { icon: 'payments', h: 'Harga Transparan', p: 'Lihat daftar layanan & harga di muka. Tak ada biaya tersembunyi, tinggal pilih yang sesuai kantong.' },
  { icon: 'map', h: 'Lokal Maluku Utara', p: 'Dibuat untuk warga MalUt. Laundry di Ternate, Tidore, Sofifi & sekitarnya dalam satu tempat.' },
];

export function KenapaSection() {
  return (
    <section style={{ paddingTop: 8 }}><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">favorite</span> Kenapa BALAUNDRY</span>
        <h2>Kenapa cari laundry di sini?</h2>
      </Reveal>
      <div className="why">
        {VALUES.map((v, i) => (
          <Reveal key={v.h} delay={i === 0 ? undefined : (i as 1 | 2 | 3)}>
            <div className="wc">
              <div className="wi"><span className="material-symbols-outlined">{v.icon}</span></div>
              <h4>{v.h}</h4>
              <p>{v.p}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div></section>
  );
}
