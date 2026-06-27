'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Hero (section 1). Port 1:1 balaundry-lp-final.html hero.
// PATH: src/components/balaundry/public/hero-section.tsx
// Kiri = teks+search+chips (gaya mockup). Kanan = <BalaundryHeroMap/> (peta
// asli, JANGAN ubah) + floating .fstat. Chrome global. Material Symbols.
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BalaundryHeroMap } from './map/BalaundryHeroMap';

const KOTA = ['Ternate', 'Tidore Kepulauan', 'Sofifi', 'Halmahera Utara', 'Halmahera Selatan'];

// bubble configs DETERMINISTIK (hindari hydration mismatch — no Math.random di render).
const BUBBLES = [
  { l: 6, s: 26, d: 9, dl: 0 }, { l: 16, s: 12, d: 11, dl: 2 }, { l: 27, s: 34, d: 8, dl: 4 },
  { l: 38, s: 16, d: 13, dl: 1 }, { l: 49, s: 22, d: 10, dl: 5 }, { l: 60, s: 14, d: 12, dl: 3 },
  { l: 70, s: 30, d: 9, dl: 6 }, { l: 80, s: 18, d: 11, dl: 1.5 }, { l: 88, s: 24, d: 8, dl: 4.5 },
  { l: 12, s: 10, d: 14, dl: 7 }, { l: 44, s: 28, d: 9, dl: 2.5 }, { l: 75, s: 12, d: 12, dl: 5.5 },
];

export function HeroSection() {
  const router = useRouter();
  const [kota, setKota] = useState('Ternate');
  const [nama, setNama] = useState('');

  const cari = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (nama.trim()) p.set('q', nama.trim());
    if (kota) p.set('kota', kota);
    const qs = p.toString();
    router.push(`/balaundry/cari${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="hero">
      <div className="bubbles" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <b key={i} style={{ left: `${b.l}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.dl}s` }} />
        ))}
      </div>

      <div className="wrap hero-grid">
        <div>
          <span className="badge"><span className="dot" /> Bagian dari TeraLoka · Maluku Utara</span>
          <h1>Cucian beres,<br /><span className="hl">hidup lebih tenang.</span></h1>
          <p className="hsub">
            Temukan laundry terverifikasi di sekitarmu, bandingkan layanan &amp; harga, pesan lewat
            WhatsApp, lalu lacak status cucianmu cukup dengan kode pesanan.
          </p>

          <form className="search" onSubmit={cari}>
            <div className="fld loc">
              <span className="material-symbols-outlined">location_city</span>
              <select value={kota} onChange={(e) => setKota(e.target.value)} aria-label="Pilih kota">
                {KOTA.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="fld q">
              <span className="material-symbols-outlined">search</span>
              <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Cari nama laundry…" aria-label="Cari nama laundry" />
            </div>
            <button type="submit" className="go"><span className="material-symbols-outlined">search</span> Cari</button>
          </form>

          <div className="chips">
            <span className="chip"><span className="material-symbols-outlined">near_me</span> Laundry terdekat</span>
            <span className="chip"><span className="material-symbols-outlined">balance</span> Bandingkan harga</span>
            <span className="chip"><span className="material-symbols-outlined">verified_user</span> Outlet terpercaya</span>
          </div>
        </div>

        {/* kanan: peta asli (JANGAN ubah) + floating glass stats */}
        <div className="washer-stage">
          <BalaundryHeroMap />
          <div className="fstat fs1">
            <div className="ic o"><span className="material-symbols-outlined">star</span></div>
            <div><b>4.8 rating</b><small>dari ulasan pelanggan</small></div>
          </div>
          <div className="fstat fs2">
            <div className="ic b"><span className="material-symbols-outlined">chat</span></div>
            <div><b>Pesan via WhatsApp</b><small>langsung ke laundry</small></div>
          </div>
        </div>
      </div>
    </div>
  );
}
