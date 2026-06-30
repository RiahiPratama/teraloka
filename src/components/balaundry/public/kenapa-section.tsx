'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Kenapa (.why). Mobile = carousel swipe + dots.
// Desktop (>640px) = grid 3 kolom (tetap). Scroll-snap native, no lib.
// PATH: src/components/balaundry/public/kenapa-section.tsx
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Reveal } from './reveal';

const VALUES = [
  { icon: 'verified_user', h: 'Terverifikasi', p: 'Setiap laundry diverifikasi tim TeraLoka sebelum tampil. Profil & rating jujur, bukan iklan berbayar.' },
  { icon: 'payments', h: 'Harga Transparan', p: 'Lihat daftar layanan & harga di muka. Tak ada biaya tersembunyi, tinggal pilih yang sesuai kantong.' },
  { icon: 'map', h: 'Lokal Maluku Utara', p: 'Dibuat untuk warga MalUt. Laundry di Ternate, Tidore, Sofifi & sekitarnya dalam satu tempat.' },
];

export function KenapaSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  // dot aktif ngikutin kartu mana yang paling ke tengah (mobile carousel)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.wc'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = cards.indexOf(e.target as HTMLElement);
            if (idx !== -1) setActive(idx);
          }
        }
      },
      { root: track, threshold: [0.6] },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelectorAll<HTMLElement>('.wc')[i];
    if (card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section style={{ paddingTop: 8 }}><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">favorite</span> Kenapa BALAUNDRY</span>
        <h2>Kenapa cari laundry di sini?</h2>
      </Reveal>

      {/* desktop: grid 3 kolom. mobile: scroll-snap carousel (track ref) */}
      <div className="why" ref={trackRef}>
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

      {/* dots — mobile only (CSS hide di desktop) */}
      <div className="why-dots" role="tablist" aria-label="Navigasi keunggulan">
        {VALUES.map((v, i) => (
          <button
            key={v.h}
            className={`why-dot${i === active ? ' on' : ''}`}
            aria-label={`Ke kartu ${i + 1}: ${v.h}`}
            aria-selected={i === active}
            role="tab"
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div></section>
  );
}
