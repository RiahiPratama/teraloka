'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Galeri adaptif (1 / 2 / 3 / 4 / >4 foto)
// PATH: src/components/bakos/public/detail/kos-gallery.tsx
// Layout kanan nyesuaikan jumlah foto samping (class .side-1..4 di grid).
// ════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { MS } from './types';

export function KosGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const side = photos.slice(1, 5);          // maks 4 foto samping
  const extra = photos.length - 5;          // sisa buat overlay "+N"

  return (
    <div className="bkd-gal" id="sec-foto" style={{ scrollMarginTop: 120 }}>
      <div className={`bkd-grid side-${side.length}`}>
        <div className={`bkd-cell ${side.length ? 'hero' : 'solo'}`} onClick={() => setActive(0)}>
          {photos.length > 0
            ? <img src={photos[active] || photos[0]} alt={title} />
            : <div className="empty"><MS n="apartment" /></div>}
          {photos.length > 1 && (
            <div className="bkd-dots">
              {photos.map((_, i) => (
                <button key={i} className={i === active ? 'on' : ''}
                  onClick={(e) => { e.stopPropagation(); setActive(i); }} />
              ))}
            </div>
          )}
        </div>
        {side.map((p, i) => (
          <div className="bkd-cell" key={i} onClick={() => setActive(i + 1)}>
            <img src={p} alt="" />
            {i === side.length - 1 && extra > 0 && (
              <div className="bkd-more"><MS n="photo_library" /> +{extra} foto</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
