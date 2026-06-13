'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — HeroMap (peta preview di hero, gaya BALAPOR)
// PATH: src/components/bakos/public/map/HeroMap.tsx
// Self-fetch /bakos/kota + /bakos/sebaran. Peta LOCKED (preview, anti
// scroll-trap). Marker tetap clickable → /bakos/cari. Picker compact.
// L+: chip kota DRAG-TO-SCROLL (tarik mouse/jari). PENANDA: BK-DRAG-PICK.
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { API_URL } from '../bakos-links';
import './bakos-map.css';

const BakosKotaMap = dynamic(
  () => import('./BakosKotaMap').then((m) => m.BakosKotaMap),
  { ssr: false, loading: () => <div className="bkmap-loading sm">Memuat peta…</div> },
);

interface KotaItem { id: string; name: string; type: string; jumlah_kos: number; }
interface KelPoint {
  location_id: string; kelurahan: string; kecamatan: string | null;
  latitude: number; longitude: number; jumlah_kos: number;
}

// ── drag-to-scroll: tarik chip pakai mouse/jari (klik tetap jalan kalau gak nge-drag) ──
function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });

  const onDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    drag.current = { down: true, moved: false, startX: e.pageX, startScroll: el.scrollLeft };
  }, []);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }, []);
  const end = useCallback(() => { drag.current.down = false; }, []);

  // dipakai child: kalau habis drag, batalin klik (biar gak salah pilih kota)
  const guardClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); }
  }, []);

  return { ref, onDown, onMove, end, guardClick, dragging: () => drag.current.moved };
}

export function HeroMap() {
  const router = useRouter();
  const [kota, setKota] = useState<KotaItem[]>([]);
  const [kel, setKel] = useState<KelPoint[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ds = useDragScroll();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kr, sr] = await Promise.all([
          fetch(`${API_URL}/bakos/kota`).then((r) => r.json()),
          fetch(`${API_URL}/bakos/sebaran`).then((r) => r.json()),
        ]);
        if (!alive) return;
        const kotaData: KotaItem[] = kr.data ?? [];
        setKota(kotaData);
        setKel(sr.data ?? []);
        const top = kotaData.find((k) => k.jumlah_kos > 0) ?? kotaData[0];
        setSelected(top?.id ?? null);
      } catch { /* silent */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const selKota = useMemo(() => kota.find((k) => k.id === selected), [kota, selected]);
  const hasKos = (selKota?.jumlah_kos ?? 0) > 0;
  const points = hasKos ? kel : [];
  const onPick = (id: string) => router.push(`/bakos/cari?location_id=${id}`);

  return (
    <div className="bk-heromap">
      {/* picker kota/kab — DRAG-TO-SCROLL (BK-DRAG-PICK) */}
      <div
        className="bk-heromap-pick"
        ref={ds.ref}
        onMouseDown={ds.onDown}
        onMouseMove={ds.onMove}
        onMouseUp={ds.end}
        onMouseLeave={ds.end}
      >
        {loading
          ? [1, 2, 3].map((i) => <span key={i} className="bkmap-chip sm skel" />)
          : kota.map((k) => (
            <button
              key={k.id}
              className={`bkmap-chip sm${selected === k.id ? ' on' : ''}${k.jumlah_kos === 0 ? ' empty' : ''}`}
              onClick={(e) => { if (ds.dragging()) { ds.guardClick(e); return; } setSelected(k.id); }}
            >
              {k.name}<span className="b">{k.jumlah_kos}</span>
            </button>
          ))}
      </div>

      <div className="bk-heromap-frame">
        {selKota && (
          <div className="bkmap-counter sm">
            <span className="material-symbols-outlined">apartment</span>
            {hasKos ? `${selKota.jumlah_kos} kos · ${selKota.name}` : selKota.name}
          </div>
        )}
        {loading ? (
          <div className="bkmap-loading sm">Memuat peta…</div>
        ) : hasKos ? (
          <>
            <BakosKotaMap points={points} onPick={onPick} height={340} pannable />
            <button className="bkmap-explore sm" onClick={() => router.push('/bakos/cari')}>
              Eksplor peta <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </>
        ) : (
          <div className="bkmap-empty sm">
            <span className="material-symbols-outlined">eco</span>
            <p className="t">Belum ada kos di {selKota?.name ?? 'sini'}</p>
            <p className="s">Segera hadir.</p>
            <button onClick={() => { const t = kota.find((k) => k.jumlah_kos > 0); if (t) setSelected(t.id); }}>
              Lihat Ternate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
