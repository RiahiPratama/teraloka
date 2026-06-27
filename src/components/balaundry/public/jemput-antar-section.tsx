'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Jemput & Antar (.dband). Port 1:1 mockup. Statis.
// PATH: src/components/balaundry/public/jemput-antar-section.tsx
// 🛡️ Mockup pakai emoji truck — DIGANTI Material Symbol (hard rule no emoji).
// ════════════════════════════════════════════════════════════════

import { Reveal } from './reveal';

export function JemputAntarSection() {
  return (
    <section style={{ paddingTop: 8 }}><div className="wrap">
      <Reveal className="dband">
        <div>
          <span className="kick"><span className="material-symbols-outlined">local_shipping</span> Praktis</span>
          <h3>Jemput &amp; Antar Lebih Praktis</h3>
          <p>Banyak laundry mendukung pickup-delivery. Cucian dijemput, dicuci, lalu diantar balik — kamu tinggal terima beres.</p>
          <div className="tags">
            <span className="tg">Kiloan</span><span className="tg">Express</span><span className="tg">Antar Jemput</span>
          </div>
        </div>
        <div className="truck" aria-hidden="true"><span className="material-symbols-outlined">local_shipping</span></div>
      </Reveal>
    </div></section>
  );
}
