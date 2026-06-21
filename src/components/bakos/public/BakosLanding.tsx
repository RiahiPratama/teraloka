'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Landing orchestrator (public LP)
// PATH: src/components/bakos/public/BakosLanding.tsx
// 🛡️ Chrome (navbar/ticker/footer) DISEDIAKAN layout (public) global —
//    TIDAK di-render di sini (hindari dobel). Disclaimer record-only tetap
//    ditampilkan di body. Data layer = port page.tsx lama (type=kos).
// L+: race-guard (reqId) + debounce 300ms — fix hasil basi saat ngetik cepat.
//     param harga = min_price/max_price (snake_case, samain BE). PENANDA: BK-SEARCH-RACE.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import './bakos-landing.css';
import { API_URL, facLabel, type Listing } from './bakos-links';
import { HeroSection } from './hero-section';
import { AreaSection } from './area-section';
import { ListingGrid } from './listing-grid';
import { KenapaSection } from './kenapa-section';
import { OwnerCtaSection } from './owner-cta-section';

export function BakosLanding() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [priceFilter, setPriceFilter] = useState(searchParams.get('filter') || 'all');
  const [kosType, setKosType] = useState(searchParams.get('type') || '');
  const [facilities, setFacilities] = useState<string[]>(searchParams.get('facilities')?.split(',').filter(Boolean) ?? []);

  // 🛡️ race-guard: tiap fetch dapat id; cuma fetch TERBARU yang boleh set hasil.
  const reqIdRef = useRef(0);

  const fetchListings = useCallback(async () => {
    const myId = ++reqIdRef.current;   // klaim id terbaru
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'kos', limit: '30' });
      const [minStr, maxStr] = priceFilter !== 'all' ? priceFilter.split('-') : ['', ''];
      if (minStr && minStr !== '0') params.set('min_price', minStr);
      if (maxStr && maxStr !== '99999999') params.set('max_price', maxStr);
      if (searchInput) params.set('q', searchInput);
      if (facilities.length) params.set('facilities', facilities.join(',')); // filter di BE (OTAK)

      const res = await fetch(`${API_URL}/listings?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error();

      // 🛡️ kalau ada fetch lebih baru yang sudah jalan, BUANG hasil ini (basi).
      if (myId !== reqIdRef.current) return;

      let results: Listing[] = data.data ?? [];
      // TD-BAKOS-01: kos_type difilter di client (backend belum support).
      if (kosType) results = results.filter((l) => l.kos_type === kosType);

      setError(false);
      setListings(results);
      setTotal(data.meta?.total ?? results.length);
    } catch {
      if (myId !== reqIdRef.current) return;   // jangan timpa state dgn error basi
      setError(true);
      setListings([]);
      setTotal(0);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, [priceFilter, searchInput, kosType, facilities]);

  // 🛡️ debounce 300ms: jangan nembak tiap huruf; tunggu user berhenti ngetik.
  useEffect(() => {
    const t = setTimeout(() => { fetchListings(); }, 300);
    return () => clearTimeout(t);
  }, [fetchListings]);

  // 🔗 sync state → URL (shareable + refresh-safe). facilities ikut (pola useSearchParams).
  useEffect(() => {
    const p = new URLSearchParams();
    if (searchInput.trim()) p.set('q', searchInput.trim());
    if (kosType) p.set('type', kosType);
    if (priceFilter !== 'all') p.set('filter', priceFilter);
    if (facilities.length) p.set('facilities', facilities.join(','));
    const qs = p.toString();
    router.replace(`/bakos${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [searchInput, kosType, priceFilter, facilities, router]);

  const toggleFac = (k: string) =>
    setFacilities((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  const reset = () => { setSearchInput(''); setPriceFilter('all'); setKosType(''); setFacilities([]); };
  const scrollToList = () =>
    document.getElementById('bk-listings')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bakos-lp">
      <HeroSection
        total={total}
        loading={loading}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        kosType={kosType}
        setKosType={setKosType}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        facilities={facilities}
        onToggleFac={(k) => { toggleFac(k); scrollToList(); }}
        onApplyFac={(keys) => { setFacilities(keys); scrollToList(); }}
        onSearch={scrollToList}
      />

      <AreaSection listings={listings} onPick={(q) => { setSearchInput(q); scrollToList(); }} />
      <ListingGrid listings={listings} loading={loading} searchInput={searchInput} onReset={reset} error={error} onRetry={fetchListings}
        emptyHint={facilities.length ? `Tidak ada kos dengan fasilitas: ${facilities.map(facLabel).join(', ')}. Coba kurangi pilihan.` : undefined} />
      <KenapaSection />
      <OwnerCtaSection />

      <div className="bk-wrap">
        <p className="bk-disclaimer">
          BAKOS tidak memegang uang sewa — transaksi sewa langsung antara penyewa dan pemilik kos.
        </p>
      </div>
    </div>
  );
}
