'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY — HeroMap (peta sebaran di hero, interaktif)
// PATH: src/components/balaundry/public/map/BalaundryHeroMap.tsx
// Clone bakos/public/map/HeroMap. Self-fetch /balaundry/kota + /sebaran.
// Chip kota (drag-to-scroll) → peta marker per node. Klik marker → directory
// per-lokasi (sementara /balaundry?location_id=, cari belum ada). Royal blue.
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/balaundry-links';
import './balaundry-map.css';

const BalaundryKotaMap = dynamic(
  () => import('./BalaundryKotaMap').then((m) => m.BalaundryKotaMap),
  { ssr: false, loading: () => <div className="blmap-loading sm">Memuat peta…</div> },
);

interface KotaItem { id: string; name: string; type: string; jumlah_laundry: number; }
interface LaundryPoint {
  location_id: string; kelurahan: string; kecamatan: string | null;
  latitude: number; longitude: number; jumlah_laundry: number;
}

// ── drag-to-scroll chip (tarik mouse/jari; klik tetap jalan kalau gak drag) ──
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
  const guardClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); }
  }, []);
  return { ref, onDown, onMove, end, guardClick, dragging: () => drag.current.moved };
}

export function BalaundryHeroMap() {
  const router = useRouter();
  const [kota, setKota] = useState<KotaItem[]>([]);
  const [kel, setKel] = useState<LaundryPoint[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ds = useDragScroll();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kr, sr] = await Promise.all([
          fetch(`${API_URL}/balaundry/kota`).then((r) => r.json()),
          fetch(`${API_URL}/balaundry/sebaran`).then((r) => r.json()),
        ]);
        if (!alive) return;
        const kotaData: KotaItem[] = kr.data ?? [];
        setKota(kotaData);
        setKel(sr.data ?? []);
        const top = kotaData.find((k) => k.jumlah_laundry > 0) ?? kotaData[0];
        setSelected(top?.id ?? null);
      } catch { /* silent */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const selKota = useMemo(() => kota.find((k) => k.id === selected), [kota, selected]);
  const hasLaundry = (selKota?.jumlah_laundry ?? 0) > 0;
  // marker per kota terpilih: filter sebaran by pill_id == kota id (climb backend).
  const points = useMemo(
    () => (hasLaundry ? kel.filter((p) => (p as any).pill_id === selected) : []),
    [hasLaundry, kel, selected],
  );
  // sementara cari belum ada → arahkan ke directory landing per-lokasi.
  const onPick = (id: string) => router.push(`/balaundry?location_id=${id}`);

  return (
    <div className="bl-heromap">
      <div
        className="bl-heromap-pick"
        ref={ds.ref}
        onMouseDown={ds.onDown}
        onMouseMove={ds.onMove}
        onMouseUp={ds.end}
        onMouseLeave={ds.end}
      >
        {loading
          ? [1, 2, 3].map((i) => <span key={i} className="blmap-chip sm skel" />)
          : kota.map((k) => (
            <button
              key={k.id}
              className={`blmap-chip sm${selected === k.id ? ' on' : ''}${k.jumlah_laundry === 0 ? ' empty' : ''}`}
              onClick={(e) => { if (ds.dragging()) { ds.guardClick(e); return; } setSelected(k.id); }}
            >
              {k.name}<span className="b">{k.jumlah_laundry}</span>
            </button>
          ))}
      </div>

      <div className="bl-heromap-frame">
        {selKota && (
          <div className="blmap-counter sm">
            <span className="material-symbols-outlined">local_laundry_service</span>
            {hasLaundry ? `${selKota.jumlah_laundry} laundry · ${selKota.name}` : selKota.name}
          </div>
        )}
        {loading ? (
          <div className="blmap-loading sm">Memuat peta…</div>
        ) : hasLaundry ? (
          <>
            <BalaundryKotaMap points={points} onPick={onPick} height={340} pannable />
            <button className="blmap-explore sm" onClick={() => router.push('/balaundry')}>
              Lihat semua <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </>
        ) : (
          <div className="blmap-empty sm">
            <span className="material-symbols-outlined">local_laundry_service</span>
            <p className="t">Belum ada laundry di {selKota?.name ?? 'sini'}</p>
            <p className="s">Segera hadir.</p>
            <button onClick={() => { const t = kota.find((k) => k.jumlah_laundry > 0); if (t) setSelected(t.id); }}>
              Lihat Ternate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
