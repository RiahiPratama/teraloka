'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Room {
  id: string;
  room_type: string;
  description: string | null;
  price: number;
  price_period: string;
  total_rooms: number;
  available_rooms: number;
  size_m2: number | null;
  facilities: string[];
  photos: string[];
}

interface ListingDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  photos: string[];
  cover_image_url: string | null;
  price: number;
  price_period: string;
  is_negotiable: boolean;
  kos_type: string | null;
  facilities: string[];
  address: string | null;
  city_id: string | null;
  nearby_landmarks: string | null;
  listing_tier: string;
  rating_avg: number;
  rating_count: number;
  has_room_types: boolean;
  accommodation_type: string | null;
  kos_rules: string | null;
  electricity_type: string | null;
  phone: string | null;
  owner_id: string;
}

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function KosDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, token } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/listings/${slug}`);
        const data = await res.json();
        if (!data.success || !data.data) {
          router.replace('/kos');
          return;
        }
        const l = data.data;
        setListing(l);

        // Fetch room types kalau ada
        if (l.has_room_types) {
          const roomRes = await fetch(`${API_URL}/listings/${l.id}/rooms`);
          const roomData = await roomRes.json();
          if (roomData.success) setRooms(roomData.data ?? []);
        }
      } catch {
        router.replace('/kos');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug, router]);

  const handleContact = async () => {
    if (!user || !token) {
      router.push(`/login?redirect=/kos/${slug}`);
      return;
    }
    if (!listing) return;
    setContactLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings/${listing.id}/contact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setContactSuccess(true);
        // Buka WA dengan pesan otomatis
        const phone = data.data.owner_phone?.replace(/\D/g, '');
        const code = data.data.tracking_code;
        const room = selectedRoom ? rooms.find((r) => r.id === selectedRoom) : null;
        const msg = encodeURIComponent(
          `Halo, saya tertarik dengan kos "${listing.title}"${room ? ` (${room.room_type})` : ''}.\n\nKode: ${code}\n\n(via TeraLoka)`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      }
    } catch {
      alert('Gagal menghubungi pemilik. Coba lagi.');
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', system-ui" }}>
        <div style={{ height: 280, background: '#E5E7EB', animation: 'pulse 1.5s infinite' }} />
        <div style={{ padding: 16 }}>
          <div style={{ height: 24, width: '70%', background: '#E5E7EB', borderRadius: 8, marginBottom: 12 }} />
          <div style={{ height: 32, width: '40%', background: '#E5E7EB', borderRadius: 8 }} />
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
      </div>
    );
  }

  if (!listing) return null;

  const allPhotos = [
    ...(listing.cover_image_url ? [listing.cover_image_url] : []),
    ...(listing.photos || []).filter((p) => p !== listing.cover_image_url),
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', system-ui", paddingBottom: 100 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Back nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/kos" style={{ color: '#374151', fontSize: 20, textDecoration: 'none' }}>←</Link>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.title}
        </span>
        {listing.listing_tier === 'premium' && (
          <span style={{
            background: '#F59E0B', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          }}>⭐ PREMIUM</span>
        )}
      </div>

      {/* Photo gallery */}
      <div style={{ position: 'relative', height: 280, background: '#E5E7EB', overflow: 'hidden' }}>
        {allPhotos.length > 0 ? (
          <>
            <img
              src={allPhotos[activePhoto]}
              alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {allPhotos.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6,
              }}>
                {allPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    style={{
                      width: i === activePhoto ? 20 : 8,
                      height: 8, borderRadius: 4, border: 'none',
                      background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64,
          }}>🏠</div>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Main info */}
        <div style={{ padding: '16px 0', borderBottom: '1px solid #E5E7EB' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1.3, marginBottom: 8 }}>
            {listing.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#1B6B4A' }}>
              {formatRupiah(listing.price)}
            </span>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>/{listing.price_period}</span>
            {listing.is_negotiable && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#0891B2',
                background: 'rgba(8,145,178,0.1)', padding: '2px 8px', borderRadius: 10,
              }}>Nego</span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {listing.kos_type && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#374151',
                background: '#F3F4F6', padding: '4px 10px', borderRadius: 20,
                textTransform: 'capitalize',
              }}>
                Kos {listing.kos_type}
              </span>
            )}
            {listing.electricity_type && (
              <span style={{
                fontSize: 12, color: '#374151', background: '#F3F4F6',
                padding: '4px 10px', borderRadius: 20,
              }}>
                ⚡ {listing.electricity_type}
              </span>
            )}
            {listing.rating_avg > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#F59E0B',
                background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 20,
              }}>
                ⭐ {listing.rating_avg.toFixed(1)} ({listing.rating_count})
              </span>
            )}
          </div>

          {(listing.address || listing.city_id) && (
            <p style={{ fontSize: 13, color: '#6B7280', display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <span>📍</span>
              <span>{[listing.address, listing.city_id].filter(Boolean).join(', ')}</span>
            </p>
          )}

          {listing.nearby_landmarks && (
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              🏛️ {listing.nearby_landmarks.split('Dekat').filter(Boolean).map(s => 'Dekat' + s.trim()).join(' · ')}
            </p>
          )}
        </div>

        {/* Deskripsi */}
        {listing.description && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Tentang Kos</h2>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* Fasilitas Bersama */}
        {listing.facilities?.length > 0 && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
              Fasilitas Bersama
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {listing.facilities.map((f, i) => (
                <span key={i} style={{
                  fontSize: 12, color: '#374151',
                  background: '#F0FDF4', border: '1px solid #BBF7D0',
                  padding: '5px 10px', borderRadius: 20,
                }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tipe Kamar */}
        {listing.has_room_types && rooms.length > 0 && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
              Tipe Kamar
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id === selectedRoom ? null : room.id)}
                  style={{
                    background: selectedRoom === room.id ? 'rgba(27,107,74,0.05)' : '#fff',
                    border: `2px solid ${selectedRoom === room.id ? '#1B6B4A' : '#E5E7EB'}`,
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                          {room.room_type}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: room.available_rooms > 0 ? '#10B981' : '#EF4444',
                          background: room.available_rooms > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          padding: '2px 7px', borderRadius: 10,
                        }}>
                          {room.available_rooms > 0 ? `${room.available_rooms} tersedia` : 'Penuh'}
                        </span>
                      </div>

                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1B6B4A', marginBottom: 6 }}>
                        {formatRupiah(room.price)}
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>/{room.price_period}</span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {room.size_m2 && (
                          <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 10 }}>
                            📐 {room.size_m2}m²
                          </span>
                        )}
                        {room.facilities?.slice(0, 3).map((f, i) => (
                          <span key={i} style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 10 }}>
                            {f}
                          </span>
                        ))}
                        {(room.facilities?.length || 0) > 3 && (
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{room.facilities.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {selectedRoom === room.id && (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#1B6B4A', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, flexShrink: 0, marginLeft: 8,
                      }}>✓</div>
                    )}
                  </div>

                  {/* Room photos */}
                  {room.photos?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
                      {room.photos.map((p, i) => (
                        <img key={i} src={p} alt=""
                          style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedRoom && (
              <p style={{ fontSize: 12, color: '#1B6B4A', fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                ✓ Kamar dipilih — klik Hubungi untuk tanya ke pemilik
              </p>
            )}
          </div>
        )}

        {/* Peraturan Kos */}
        {listing.kos_rules && (
          <div style={{ padding: '16px 0', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Peraturan Kos
            </h2>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {listing.kos_rules}
            </p>
          </div>
        )}

      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #E5E7EB',
        padding: '12px 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {contactSuccess ? (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981',
              borderRadius: 12, padding: '12px 16px', textAlign: 'center',
            }}>
              <p style={{ fontWeight: 700, color: '#10B981', fontSize: 14 }}>✅ WhatsApp sudah dibuka!</p>
              <p style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                Lanjutkan percakapan dengan pemilik kos
              </p>
            </div>
          ) : (
            <button
              onClick={handleContact}
              disabled={contactLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: contactLoading
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #1B6B4A, #0891B2)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: contactLoading ? 'wait' : 'pointer',
                boxShadow: contactLoading ? 'none' : '0 4px 16px rgba(27,107,74,0.3)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {contactLoading ? (
                'Menghubungi...'
              ) : user ? (
                <>
                  <span style={{ fontSize: 18 }}>💬</span>
                  {selectedRoom ? `Tanya kamar "${rooms.find(r=>r.id===selectedRoom)?.room_type}"` : 'Hubungi via WhatsApp'}
                </>
              ) : (
                <>
                  <span style={{ fontSize: 18 }}>🔐</span>
                  Login dulu untuk hubungi pemilik
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
