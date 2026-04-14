'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Listing {
  id: string;
  title: string;
  slug: string;
  photos: string[];
  cover_image_url: string | null;
  price: number;
  price_period: string;
  is_negotiable: boolean;
  kos_type: string | null;
  facilities: string[];
  address: string | null;
  city_id: string | null;
  listing_tier: string;
  rating_avg: number;
  rating_count: number;
  has_room_types: boolean;
  accommodation_type: string | null;
}

const PRICE_FILTERS = [
  { key: 'all', label: 'Semua Harga' },
  { key: '0-500000', label: '< Rp 500rb' },
  { key: '500000-1000000', label: 'Rp 500rb–1jt' },
  { key: '1000000-99999999', label: '> Rp 1jt' },
];

const KOS_TYPES = [
  { key: '', label: 'Semua' },
  { key: 'putra', label: '👨 Putra' },
  { key: 'putri', label: '👩 Putri' },
  { key: 'campur', label: '👫 Campur' },
];

function formatRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

function KosPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

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

      // Filter kos_type di client karena backend belum support
      let results = data.data ?? [];
      if (kosType) results = results.filter((l: Listing) => l.kos_type === kosType);

      setListings(results);
      setTotal(data.meta?.total ?? results.length);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [priceFilter, searchInput, kosType]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D2818 0%, #1B6B4A 60%, #0891B2 100%)',
        padding: '48px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
            ← TeraLoka
          </Link>
          <h1 style={{
            color: '#fff', fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.5px', marginTop: 8, marginBottom: 4,
          }}>
            🏠 BAKOS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20 }}>
            Cari kos di Ternate & Maluku Utara
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama kos, lokasi..."
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                fontSize: 14, background: '#fff', color: '#111827', outline: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 20px', borderRadius: 12, border: 'none',
                background: '#E8963A', color: '#fff', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(232,150,58,0.4)',
              }}
            >
              Cari
            </button>
          </form>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', overflowX: 'auto',
      }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {/* Price filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {PRICE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPriceFilter(f.key)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: priceFilter === f.key ? '#1B6B4A' : '#F3F4F6',
                  color: priceFilter === f.key ? '#fff' : '#374151',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, background: '#E5E7EB', alignSelf: 'stretch' }} />
          {/* Kos type */}
          <div style={{ display: 'flex', gap: 6 }}>
            {KOS_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setKosType(t.key)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: kosType === t.key ? '#0891B2' : '#F3F4F6',
                  color: kosType === t.key ? '#fff' : '#374151',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}>

        {/* Result count */}
        {!loading && (
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
            {listings.length > 0
              ? `${listings.length} kos ditemukan`
              : 'Tidak ada kos yang cocok'}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ height: 160, background: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: 12 }}>
                  <div style={{ height: 16, width: '70%', background: '#F3F4F6', borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 20, width: '40%', background: '#F3F4F6', borderRadius: 6 }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
          </div>
        )}

        {/* Empty */}
        {!loading && listings.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
            padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
            <p style={{ fontWeight: 700, color: '#374151', fontSize: 16 }}>Belum ada kos</p>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>
              Coba ubah filter atau hapus kata kunci pencarian
            </p>
            <button
              onClick={() => { setSearchInput(''); setPriceFilter('all'); setKosType(''); }}
              style={{
                marginTop: 16, padding: '10px 20px', borderRadius: 10,
                background: '#1B6B4A', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Listing cards */}
        {!loading && listings.map((item) => (
          <Link
            key={item.id}
            href={`/kos/${item.slug}`}
            style={{
              display: 'block', textDecoration: 'none',
              background: '#fff', borderRadius: 16,
              border: '1px solid #E5E7EB',
              overflow: 'hidden', marginBottom: 12,
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Photo */}
            <div style={{ height: 180, background: '#E5E7EB', position: 'relative', overflow: 'hidden' }}>
              {(item.cover_image_url || item.photos?.[0]) ? (
                <img
                  src={item.cover_image_url || item.photos[0]}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #E5E7EB, #D1D5DB)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48,
                }}>🏠</div>
              )}

              {/* Badges */}
              <div style={{
                position: 'absolute', top: 10, left: 10,
                display: 'flex', gap: 6,
              }}>
                {item.listing_tier === 'premium' && (
                  <span style={{
                    background: '#F59E0B', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    padding: '3px 8px', borderRadius: 20,
                  }}>⭐ PREMIUM</span>
                )}
                {item.kos_type && (
                  <span style={{
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    fontSize: 10, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 20,
                    textTransform: 'capitalize',
                  }}>{item.kos_type}</span>
                )}
              </div>

              {item.has_room_types && (
                <div style={{
                  position: 'absolute', bottom: 10, right: 10,
                  background: 'rgba(27,107,74,0.9)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 20,
                }}>
                  Multi Tipe Kamar
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '12px 14px' }}>
              <p style={{
                fontWeight: 700, fontSize: 15, color: '#111827',
                marginBottom: 4, lineHeight: 1.3,
              }}>
                {item.title}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#1B6B4A' }}>
                  {formatRupiah(item.price)}
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>/{item.price_period}</span>
                {item.is_negotiable && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#0891B2',
                    background: 'rgba(8,145,178,0.1)', padding: '2px 6px', borderRadius: 10,
                    marginLeft: 4,
                  }}>Nego</span>
                )}
              </div>

              {/* Location */}
              {(item.address || item.city_id) && (
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  📍 {[item.address, item.city_id].filter(Boolean).join(', ')}
                </p>
              )}

              {/* Facilities preview */}
              {item.facilities?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {item.facilities.slice(0, 4).map((f, i) => (
                    <span key={i} style={{
                      fontSize: 11, color: '#374151',
                      background: '#F3F4F6', padding: '2px 8px', borderRadius: 10,
                    }}>
                      {f}
                    </span>
                  ))}
                  {item.facilities.length > 4 && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      +{item.facilities.length - 4} lainnya
                    </span>
                  )}
                </div>
              )}

              {/* Rating */}
              {item.rating_avg > 0 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#F59E0B', fontSize: 12 }}>⭐</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {item.rating_avg.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    ({item.rating_count} ulasan)
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function KosPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Memuat...</p>
      </div>
    }>
      <KosPageContent />
    </Suspense>
  );
}
