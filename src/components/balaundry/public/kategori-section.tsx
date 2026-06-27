'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Kategori (.cats). Port 1:1 mockup. Statis. Material Symbols.
// PATH: src/components/balaundry/public/kategori-section.tsx
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Reveal } from './reveal';

const KATEGORI = [
  { key: 'kiloan',   icon: 'dry_cleaning',      label: 'Cuci Kiloan' },
  { key: 'express',  icon: 'bolt',              label: 'Express' },
  { key: 'setrika',  icon: 'iron',              label: 'Setrika' },
  { key: 'bedcover', icon: 'bed',               label: 'Bed Cover' },
  { key: 'sepatu',   icon: 'footprint',         label: 'Sepatu' },
  { key: 'karpet',   icon: 'cleaning_services', label: 'Karpet' },
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
            <Link href={`/balaundry/cari?kategori=${k.key}`} className="cat">
              <div className="ci"><span className="material-symbols-outlined">{k.icon}</span></div>
              <b>{k.label}</b>
            </Link>
          </Reveal>
        ))}
      </div>
    </div></section>
  );
}
