'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — Kos Detail composer (mirror BakosLanding)
// PATH: src/components/bakos/public/detail/KosDetail.tsx
// Fetch + state (selectedRoom, activeTab, scroll-spy). Compose sections.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MS, SECTIONS, type ListingDetail, type Room } from './types';
import { KosGallery } from './kos-gallery';
import { KosSectionNav } from './kos-section-nav';
import { KosSections } from './kos-sections';
import { KosActionCard, PriceLine } from './kos-action-card';
import './bakos-detail.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function KosDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('foto');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/listings/${slug}`);
        const data = await res.json();
        if (!data.success || !data.data) { router.replace('/bakos'); return; }
        const l = data.data as ListingDetail;
        setListing(l);
        if (l.has_room_types) {
          const rr = await fetch(`${API_URL}/listings/${l.id}/rooms`);
          const rd = await rr.json();
          if (rd.success) setRooms(rd.data ?? []);
        }
      } catch { router.replace('/bakos'); }
      finally { setLoading(false); }
    };
    if (slug) run();
  }, [slug, router]);

  // scroll-spy
  useEffect(() => {
    if (!listing) return;
    const onScroll = () => {
      let cur = SECTIONS[0].id as string;
      for (const s of SECTIONS) {
        const el = document.getElementById(`sec-${s.id}`);
        if (el && el.getBoundingClientRect().top <= 160) cur = s.id;
      }
      setActiveTab(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [listing]);

  const goTo = (id: string) =>
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading) {
    return (
      <div className="bkd">
        <div style={{ height: 56, borderBottom: '1px solid #E8ECEF' }} />
        <div style={{ maxWidth: 1180, margin: '20px auto', padding: '0 22px' }}>
          <div style={{ height: 28, width: '45%', background: '#E8ECEF', borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 460, background: '#E8ECEF', borderRadius: 18 }} />
        </div>
      </div>
    );
  }
  if (!listing) return null;

  const allPhotos = [
    ...(listing.cover_image_url ? [listing.cover_image_url] : []),
    ...(listing.photos || []).filter((p) => p !== listing.cover_image_url),
  ];

  return (
    <div className="bkd">
      <div className="bkd-top">
        <Link href="/bakos" className="back"><MS n="arrow_back" /></Link>
        <span className="ttl">{listing.title}</span>
        <span className="share"><MS n="ios_share" /></span>
      </div>

      <div className="bkd-wrap">
        <nav className="bkd-bc">
          <Link href="/">Home</Link><span className="sep">›</span>
          <Link href="/bakos">BAKOS</Link><span className="sep">›</span>
          {listing.area && <><span>{listing.area.split(',')[0]}</span><span className="sep">›</span></>}
          <span className="cur">{listing.title}</span>
        </nav>

        <div className="bkd-chips">
          {listing.display_id && <span className="bkd-id">{listing.display_id}</span>}
          {listing.is_verified
            ? <span className="bkd-badge verif"><MS n="verified" /> Terverifikasi</span>
            : listing.is_claimable ? <span className="bkd-badge seed"><MS n="eco" /> Belum dikelola</span> : null}
          {listing.listing_tier === 'premium' && <span className="bkd-badge prem"><MS n="star" /> Premium</span>}
        </div>
        <h1 className="bkd-h1">{listing.title}</h1>
        <div className="bkd-metarow">
          {listing.rating_avg > 0
            ? <span className="mi star"><MS n="star" /> {listing.rating_avg.toFixed(1)} <span style={{ color: 'var(--mut)', fontWeight: 500 }}>({listing.rating_count} ulasan)</span></span>
            : <span className="mi"><MS n="star" /> Belum ada ulasan</span>}
          {listing.kos_type && <span className="mi" style={{ textTransform: 'capitalize' }}><MS n="group" /> Kos {listing.kos_type}</span>}
          {(listing.address || listing.area) && <span className="mi"><MS n="location_on" /> {listing.address || listing.area}</span>}
        </div>

        <KosGallery photos={allPhotos} title={listing.title} />
        <KosSectionNav active={activeTab} onGo={goTo} />

        <div className="bkd-body">
          <div className="bkd-main">
            <KosSections listing={listing} rooms={rooms} selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} />
          </div>
          <aside className="bkd-aside">
            <div className="bkd-cta">
              <div className="pl"><PriceLine listing={listing} /></div>
              <KosActionCard listing={listing} rooms={rooms} selectedRoom={selectedRoom} />
            </div>
          </aside>
        </div>
      </div>

      <div className="bkd-mbar">
        <div className="bkd-mbar-in">
          <div className="pp"><PriceLine listing={listing} /></div>
          <div className="aa"><KosActionCard listing={listing} rooms={rooms} selectedRoom={selectedRoom} /></div>
        </div>
      </div>
    </div>
  );
}
