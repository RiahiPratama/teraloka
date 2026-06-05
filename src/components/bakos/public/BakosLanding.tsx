'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Landing orchestrator (public LP)
// PATH: src/components/bakos/public/BakosLanding.tsx
// Pegang fetch + filter state, rangkai section. Data layer = port dari
// page.tsx lama (type=kos, kos_type client-side TD-BAKOS-01).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './bakos-landing.css';
import { API_URL, type Listing } from './bakos-links';
import { HeroSection } from './hero-section';
import { AreaSection } from './area-section';
import { MapSection } from './map-section';
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
      {/* ticker BAKABAR — 🛡️ teks statis (wire ke feed BAKABAR nanti) */}
      <div className="bk-tk"><div className="bk-wrap bk-tk-in">
        <span className="it"><b>BAKOS:</b> kos baru tiap minggu</span>
        <span className="it">Powered by BAKABAR — berita lokal Maluku Utara</span>
        <span className="it">Kontak pemilik langsung lewat WhatsApp</span>
      </div></div>

      {/* topbar */}
      <header className="bk-tb"><div className="bk-wrap bk-tb-in">
        <Link className="bk-logo" href="/">
          <span className="mark"><span className="material-symbols-outlined">apartment</span></span>
          <b>Tera<span>Loka</span></b>
        </Link>
        <nav className="bk-nav">
          <Link href="/bakabar">BAKABAR</Link>
          <Link href="/balapor">BALAPOR</Link>
          <Link href="/bakos" className="on">BAKOS</Link>
          <Link href="/badonasi">BADONASI</Link>
        </nav>
        <Link className="bk-login" href="/login">Login / Daftar</Link>
      </div></header>

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

      <AreaSection onPick={(q) => { setSearchInput(q); scrollToList(); }} />
      <MapSection />
      <ListingGrid listings={listings} loading={loading} searchInput={searchInput} onReset={reset} />
      <KenapaSection />
      <OwnerCtaSection />

      <footer className="bk-footer"><div className="bk-wrap">
        <div className="bk-ft">
          <span className="c">© 2026 TeraLoka · BAKOS · Maluku Utara</span>
          <span className="cities">TERNATE · TIDORE · SOFIFI · TOBELO</span>
        </div>
        <div className="bk-fnote">BAKOS tidak memegang uang sewa — transaksi sewa langsung antara penyewa dan pemilik kos.</div>
      </div></footer>
    </div>
  );
}
