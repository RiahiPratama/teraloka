'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Kategori (.cats). Statis display (no link — cari belum ada).
// Tiap icon punya animasi hover/touch sendiri (data-anim). Material Symbols.
// PATH: src/components/balaundry/public/kategori-section.tsx
// 🛡️ Link dimatiin (cari = Tahap C). data-anim → CSS per kategori.
// ════════════════════════════════════════════════════════════════

import { Reveal } from './reveal';

const KATEGORI = [
  { key: 'kiloan',   icon: 'dry_cleaning',      label: 'Cuci Kiloan', anim: 'swing' },
  { key: 'express',  icon: 'bolt',              label: 'Express',     anim: 'flash' },
  { key: 'setrika',  icon: 'iron',              label: 'Setrika',     anim: 'iron'  },
  { key: 'bedcover', icon: 'bed',               label: 'Bed Cover',   anim: 'bounce'},
  { key: 'sepatu',   icon: 'footprint',         label: 'Sepatu',      anim: 'step'  },
  { key: 'karpet',   icon: 'cleaning_services', label: 'Karpet',      anim: 'sweep' },
];

export function KategoriSection() {
  return (
    <section><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">category</span> Layanan</span>
        <h2>Kategori Layanan</h2>
        <p>Apa pun kebutuhan cucianmu, ada laundry yang melayaninya.</p>
      </Reveal>
      <div className="cats">
        {KATEGORI.map((k, i) => (
          <Reveal key={k.key} delay={(i % 3) === 1 ? 1 : (i % 3) === 2 ? 2 : undefined}>
            <div className="cat" data-anim={k.anim} tabIndex={0} role="button" aria-label={k.label}>
              <div className="ci"><span className="material-symbols-outlined">{k.icon}</span></div>
              <b>{k.label}</b>
            </div>
          </Reveal>
        ))}
      </div>
    </div></section>
  );
}
