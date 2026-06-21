'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — Cari composer (fetch + filter + debounce + URL sync)
// PATH: src/components/bakos/public/search/BakosCari.tsx
// 🛡️ Layout disiapkan utk split list+map: .bkc-body bisa jadi 2-kolom
//    begitu peta siap (tambah <aside> kanan, grid pindah kiri — zero rombak).
// 10 Jun 2026 — L5-CARI-LOCID: terima location_id dari klik marker peta hero
//   (HeroMap → /bakos/cari?location_id=...). Read-only (tak ada UI ubah),
//   diteruskan ke fetch + dipertahankan di URL sync (biar gak kehapus).
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL, PRICE_FILTERS, QUICK_FAC, facLabel, type Listing } from '../bakos-links';
import { ListingGrid } from '../listing-grid';
import { CariFilters } from './cari-filters';
import { FacilityFilterModal } from '../FacilityFilterModal';

// 🛡️ Leaflet pecah di SSR → dynamic ssr:false
const BakosKosMap = dynamic(
  () => import('./BakosKosMap').then((m) => m.BakosKosMap),
  { ssr: false, loading: () => <div className="bkc-map-loading">Memuat peta…</div> },
);
import '../bakos-landing.css';
import './bakos-cari.css';

export function BakosCari() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get('q') ?? '');
  const [kosType, setKosType] = useState(sp.get('kos_type') ?? '');
  const [priceKey, setPriceKey] = useState('all');
  const [sortKey, setSortKey] = useState('relevan');
  const [view, setView] = useState<'list' | 'map'>('list');
  // L5-CARI-LOCID — filter kelurahan dari klik peta hero. Bisa di-clear saat user ngetik (mulai cari baru).
  const [locationId, setLocationId] = useState(sp.get('location_id') ?? '');
  const [facilities, setFacilities] = useState<string[]>(sp.get('facilities')?.split(',').filter(Boolean) ?? []);
  const [facModal, setFacModal] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef(0);   // 🛡️ race-guard — token request, buang hasil basi
  const pageRef = useRef(1);  // halaman terakhir (ref → hindari stale closure di fetchKos memo)

  // reset=true (filter/q berubah): page 1 + REPLACE. reset=false ("muat lebih"): page+1 + APPEND.
  const fetchKos = useCallback(async (qVal: string, kt: string, pk: string, reset: boolean = true) => {
    const myReq = ++reqRef.current;                       // 🛡️ token request ini
    const nextPage = reset ? 1 : pageRef.current + 1;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ type: 'kos', page: String(nextPage), limit: '24' });
      if (qVal.trim()) params.set('q', qVal.trim());
      if (kt) params.set('kos_type', kt);
      if (locationId) params.set('location_id', locationId);   // L5-CARI-LOCID — filter per-kelurahan
      if (facilities.length) params.set('facilities', facilities.join(',')); // filter di BE (OTAK)
      if (pk !== 'all') {
        const [mn, mx] = pk.split('-');
        if (Number(mn) > 0) params.set('min_price', mn);
        if (Number(mx) > 0) params.set('max_price', mx);
      }
      const res = await fetch(`${API_URL}/listings?${params.toString()}`);
      const data = await res.json();
      if (myReq !== reqRef.current) return;               // 🛡️ hasil basi (filter berubah) → buang
      const items: Listing[] = data.data ?? data.listings ?? [];
      const more = Boolean(data.meta?.has_more ?? data.pagination?.has_more ?? false);
      setError(false);
      // append + dedupe-by-id defensif (order BE bisa tie di boundary → cegah dupe key)
      setListings((prev) => reset
        ? items
        : [...prev, ...items.filter((it) => !prev.some((p) => p.id === it.id))]);
      setHasMore(more);
      setTotal(data.pagination?.total ?? data.meta?.total ?? data.total ?? items.length);
      pageRef.current = nextPage;
    } catch {
      if (myReq !== reqRef.current) return;
      if (reset) { setError(true); setListings([]); setTotal(0); setHasMore(false); }
    } finally {
      if (myReq === reqRef.current) { reset ? setLoading(false) : setLoadingMore(false); }
    }
  }, [locationId, facilities]);

  // filter berubah → fetch (q di-debounce, pills langsung)
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => fetchKos(q, kosType, priceKey), 400);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [q, kosType, priceKey, fetchKos]);

  // sync URL (shareable) — q + kos_type + location_id (jangan buang filter peta)
  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (kosType) p.set('kos_type', kosType);
    if (locationId) p.set('location_id', locationId);   // L5-CARI-LOCID — pertahankan di URL
    if (facilities.length) p.set('facilities', facilities.join(','));
    const qs = p.toString();
    router.replace(`/bakos/cari${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [q, kosType, locationId, facilities, router]);

  // sort client-side (BE belum support sort param) — PENANDA BKC-SORT
  const sorted = [...listings].sort((a, b) => {
    if (sortKey === 'termurah') return (a.price ?? 0) - (b.price ?? 0);
    if (sortKey === 'termahal') return (b.price ?? 0) - (a.price ?? 0);
    return 0; // relevan = urutan dari BE
  });

  // C-PREMIUM-ONLY: kos berkoordinat = berbayar (BE gate). Tombol Peta muncul HANYA kalau ada.
  const mapPoints = sorted.filter((k) => k.latitude != null && k.longitude != null);
  const hasMap = mapPoints.length > 0;

  // kalau lagi di view map tapi tak ada titik (mis. filter berubah) → balik list
  useEffect(() => { if (view === 'map' && !hasMap) setView('list'); }, [view, hasMap]);

  const toggleFac = (k: string) =>
    setFacilities((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  const reset = () => { setQ(''); setKosType(''); setPriceKey('all'); setSortKey('relevan'); setLocationId(''); setFacilities([]); };

  return (
    <div className="bkc">
      {/* filter bar sticky */}
      <div className="bkc-bar">
        <div className="bkc-wrap">
          <div className="bkc-search">
            <span className="material-symbols-outlined">search</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                // 🛡️ user ngetik = mulai cari baru → buang filter kelurahan dari klik peta hero
                //    (kalau tak di-clear, q + location_id saling sempitin → 0 hasil walau kos ada).
                if (locationId) setLocationId('');
              }}
              placeholder="Cari nama kos, area (mis. Bastiong, Akehuda)…"
            />
            {q && <button className="x" onClick={() => setQ('')} aria-label="Hapus">
              <span className="material-symbols-outlined">close</span>
            </button>}
          </div>
          <CariFilters
            kosType={kosType} priceKey={priceKey} sortKey={sortKey}
            onKosType={setKosType} onPrice={setPriceKey} onSort={setSortKey}
          />
        </div>
      </div>

      {/* chip filter fasilitas (quick, multi-select) → ?facilities (BUKAN teks q). Sisanya via modal. */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 22px 0', maxWidth: 1180, margin: '0 auto' }}>
        {QUICK_FAC.map((f) => {
          const on = facilities.includes(f.key);
          return (
            <button key={f.key} type="button" aria-pressed={on} onClick={() => toggleFac(f.key)}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                border: `1px solid ${on ? '#1B6B4A' : '#E4E0D5'}`, background: on ? '#1B6B4A' : '#fff', color: on ? '#fff' : '#5b5b58' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{f.icon}</span> {facLabel(f.key)}
            </button>
          );
        })}
        {/* tombol modal SEMUA fasilitas — badge = jumlah aktif (quick + non-quick) */}
        <button type="button" aria-haspopup="dialog" onClick={() => setFacModal(true)}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            border: '1px solid #1B6B4A', background: '#fff', color: '#1B6B4A' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span> Filter fasilitas{facilities.length ? ` (${facilities.length})` : ''}
        </button>
      </div>

      <FacilityFilterModal open={facModal} onClose={() => setFacModal(false)} value={facilities} onApply={setFacilities} />

      {/* toggle List ⟷ Peta — muncul HANYA kalau ada kos berbayar (berkoordinat) */}
      {hasMap && (
        <div className="bkc-viewtoggle">
          <button className={`bkc-vt${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')}>
            <span className="material-symbols-outlined">view_list</span> Daftar
          </button>
          <button className={`bkc-vt${view === 'map' ? ' on' : ''}`} onClick={() => setView('map')}>
            <span className="material-symbols-outlined">map</span> Peta
            <span className="bkc-vt-count">{mapPoints.length}</span>
          </button>
        </div>
      )}

      {/* hasil — list ATAU peta (C-premium-only) */}
      <div className="bkc-body">
        {view === 'map' && hasMap ? (
          <div className="bkc-mapview">
            <BakosKosMap items={mapPoints} />
          </div>
        ) : (
          <div className="bkc-results">
            <ListingGrid listings={sorted} loading={loading} searchInput={q} total={total} onReset={reset} error={error} onRetry={() => fetchKos(q, kosType, priceKey)}
              emptyHint={facilities.length ? `Tidak ada kos dengan fasilitas: ${facilities.map(facLabel).join(', ')}. Coba kurangi pilihan.` : undefined} />

            {/* Muat lebih banyak — hanya kalau masih ada halaman & bukan loading awal */}
            {hasMore && !loading && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '22px 0 8px' }}>
                <button
                  type="button"
                  className="bk-loadmore"
                  onClick={() => fetchKos(q, kosType, priceKey, false)}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? 'Memuat…'
                    : <><span className="material-symbols-outlined">expand_more</span> Muat lebih banyak</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
