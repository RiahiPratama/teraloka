'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Owner Band (.oband) + mesin cuci (.washer). Port 1:1 mockup.
// PATH: src/components/balaundry/public/owner-cta-section.tsx
// Gradient deep + bubble rise + washer (drum muter). "Daftarkan Laundry
// Gratis" → owner area (sementara). Statis. Material Symbols.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Reveal } from './reveal';

export function OwnerBand() {
  return (
    <section style={{ paddingTop: 8 }}><div className="wrap">
      <Reveal className="oband">
        <div className="bubbles2" aria-hidden="true">
          <i style={{ width: 60, height: 60, left: '20%', animationDelay: '0s' }} />
          <i style={{ width: 40, height: 40, left: '70%', animationDelay: '2s' }} />
          <i style={{ width: 28, height: 28, left: '45%', animationDelay: '4s' }} />
        </div>
        <div>
          <span className="kick">Untuk Pemilik Laundry</span>
          <h2>Punya usaha laundry? Dapatkan pelanggan baru.</h2>
          <p>Buat profil gratis, kelola order, dan tampil di pencarian warga Maluku Utara — semua dari satu dashboard.</p>
          <div className="olist">
            <div><span className="ck"><span className="material-symbols-outlined">check</span></span> Tampil di direktori &amp; pencarian warga</div>
            <div><span className="ck"><span className="material-symbols-outlined">check</span></span> Kelola order &amp; status cucian online</div>
            <div><span className="ck"><span className="material-symbols-outlined">check</span></span> Naikkan kepercayaan lewat rating &amp; ulasan</div>
          </div>
          <Link className="obtn" href="/owner/balaundry">Daftarkan Laundry Gratis <span className="material-symbols-outlined">arrow_forward</span></Link>
        </div>

        {/* mesin cuci CSS — drum muter + air slosh (GPU transform) */}
        <div className="vis" aria-hidden="true">
          <div className="washer">
            <div className="top"><span className="knob s" /><span className="knob" /></div>
            <div className="door">
              <div className="drum"><span className="lh a" /><span className="lh b" /><span className="lh c" /></div>
              <div className="water" />
            </div>
          </div>
        </div>
      </Reveal>
    </div></section>
  );
}
