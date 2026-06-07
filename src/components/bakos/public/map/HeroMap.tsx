'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — HeroMap (peta preview di hero, gaya BALAPOR)
// PATH: src/components/bakos/public/map/HeroMap.tsx
// Self-fetch /bakos/kota + /bakos/sebaran. Peta LOCKED (preview, anti
// scroll-trap). Marker tetap clickable → /bakos/cari. Picker compact.
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
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

export function HeroMap() {
  const router = useRouter();
  const [kota, setKota] = useState<KotaItem[]>([]);
  const [kel, setKel] = useState<KelPoint[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      {/* picker kota/kab — compact, horizontal scroll */}
      <div className="bk-heromap-pick">
        {loading
          ? [1, 2, 3].map((i) => <span key={i} className="bkmap-chip sm skel" />)
          : kota.map((k) => (
            <button
              key={k.id}
              className={`bkmap-chip sm${selected === k.id ? ' on' : ''}${k.jumlah_kos === 0 ? ' empty' : ''}`}
              onClick={() => setSelected(k.id)}
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
            <BakosKotaMap points={points} onPick={onPick} height={340} locked />
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
