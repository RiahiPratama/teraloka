'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Landing orchestrator (public LP)
// PATH: src/components/bakos/public/BakosLanding.tsx
// 🛡️ Chrome (navbar/ticker/footer) DISEDIAKAN layout (public) global —
//    TIDAK di-render di sini (hindari dobel). Disclaimer record-only tetap
//    ditampilkan di body. Data layer = port page.tsx lama (type=kos).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import './bakos-landing.css';
import { API_URL, type Listing } from './bakos-links';
import { HeroSection } from './hero-section';
import { AreaSection } from './area-section';
import { ListingGrid } from './listing-grid';
import { KenapaSection } from './kenapa-section';
import { OwnerCtaSection } from './owner-cta-section';

export function BakosLanding() {
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [priceFilter, setPriceFilter] = useState(searchParams.get('filter') || 'all');
  const [kosType, setKosType] = useState(searchParams.get('type') || '');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'kos', limit: '30' });
      const [minStr, maxStr] = priceFilter !== 'all' ? priceFilter.split('-') : ['', ''];
      if (minStr) params.set('minPrice', minStr);
      if (maxStr && maxStr !== '99999999') params.set('maxPrice', maxStr);
      if (searchInput) params.set('q', searchInput);

      const res = await fetch(`${API_URL}/listings?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error();

      let results: Listing[] = data.data ?? [];
      // TD-BAKOS-01: kos_type difilter di client (backend belum support).
      if (kosType) results = results.filter((l) => l.kos_type === kosType);

      setListings(results);
      setTotal(data.meta?.total ?? results.length);
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [priceFilter, searchInput, kosType]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const reset = () => { setSearchInput(''); setPriceFilter('all'); setKosType(''); };
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
        onSearch={scrollToList}
      />

      <AreaSection listings={listings} onPick={(q) => { setSearchInput(q); scrollToList(); }} />
      <ListingGrid listings={listings} loading={loading} searchInput={searchInput} onReset={reset} />
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
