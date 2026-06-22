'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — Map Section (landing) — picker kota + peta kelurahan interaktif
// PATH: src/components/bakos/public/map-section.tsx
// Fetch /bakos/kota (picker + badge) + /bakos/sebaran (marker kelurahan).
// Klik marker → /bakos/cari?location_id=. Kota tanpa kos → "segera hadir".
// 🛡️ export name TETAP MapSection (dipakai BakosLanding) — gak ubah import.
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { API_URL } from './bakos-links';
import './map/bakos-map.css';

const BakosKotaMap = dynamic(
  () => import('./map/BakosKotaMap').then((m) => m.BakosKotaMap),
  { ssr: false, loading: () => <div className="bkmap-loading">Memuat peta…</div> },
);

interface KotaItem { id: string; name: string; type: string; jumlah_kos: number; }
interface KelPoint {
  location_id: string; kelurahan: string; kecamatan: string | null;
  pill_id: string;   // id pill (kota_id | 'sofifi') — buat filter marker per-pill
  latitude: number; longitude: number; jumlah_kos: number;
}

// Label pendek pill (FE-only) — BE tetap kirim nama kanonik penuh. Fallback: nama penuh.
// Ternate & Sofifi sengaja TIDAK di-map (tampil apa adanya).
const DISPLAY_LABEL: Record<string, string> = {
  'Tidore Kepulauan': 'Tidore',
  'Halmahera Tengah': 'Halteng', 'Halmahera Utara': 'Halut',
  'Halmahera Selatan': 'Halsel', 'Halmahera Barat': 'Halbar', 'Halmahera Timur': 'Haltim',
  'Kepulauan Morotai': 'Morotai', 'Kepulauan Sula': 'Sula', 'Pulau Taliabu': 'Taliabu',
};
const lbl = (name: string) => DISPLAY_LABEL[name] ?? name;

export function MapSection() {
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
  // 🛡️ FIX B — marker per-pill: hanya marker yang pill_id == pill terpilih.
  //    `selected` = id pill (kota_id | 'sofifi'), formatnya SAMA dgn SebaranItem.pill_id.
  const points = hasKos ? kel.filter((k) => k.pill_id === selected) : [];

  const onPick = (location_id: string) =>
    router.push(`/bakos/cari?location_id=${location_id}`);

  return (
    <section className="bk-sec bk-pt0"><div className="bk-wrap">
      <div className="bkmap-head">
        <div>
          <h2>Cari kos per wilayah</h2>
          <p>Pilih kota/kabupaten, lalu klik kelurahan di peta untuk lihat kos di sana.</p>
        </div>
      </div>

      {/* picker kota/kabupaten */}
      <div className="bkmap-picker">
        {loading
          ? [1, 2, 3, 4].map((i) => <span key={i} className="bkmap-chip skel" />)
          : kota.map((k) => (
            <button
              key={k.id}
              className={`bkmap-chip${selected === k.id ? ' on' : ''}${k.jumlah_kos === 0 ? ' empty' : ''}`}
              onClick={() => setSelected(k.id)}
            >
              <span className="material-symbols-outlined">location_city</span>
              {lbl(k.name)}
              <span className="b">{k.jumlah_kos}</span>
            </button>
          ))}
      </div>

      {/* frame peta */}
      <div className="bkmap-frame">
        {selKota && (
          <div className="bkmap-counter">
            <span className="material-symbols-outlined">apartment</span>
            {hasKos ? `${selKota.jumlah_kos} kos · ${lbl(selKota.name)}` : lbl(selKota.name)}
          </div>
        )}

        {loading ? (
          <div className="bkmap-loading">Memuat peta…</div>
        ) : hasKos ? (
          <>
            <BakosKotaMap points={points} onPick={onPick} />
            <button className="bkmap-explore" onClick={() => router.push('/bakos/cari')}>
              Lihat semua kos <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </>
        ) : (
          <div className="bkmap-empty">
            <span className="material-symbols-outlined">eco</span>
            <p className="t">Belum ada kos di {selKota ? lbl(selKota.name) : 'wilayah ini'}</p>
            <p className="s">BAKOS sedang berkembang. Kos di wilayah ini segera hadir.</p>
            {selKota?.jumlah_kos === 0 && (
              <button onClick={() => { const t = kota.find((k) => k.jumlah_kos > 0); if (t) setSelected(t.id); }}>
                Lihat kos di Ternate
              </button>
            )}
          </div>
        )}
      </div>
    </div></section>
  );
}
