'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Action Card (interaktif) — price + CTA 3-state + WA contact
// PATH: src/components/bakos/public/detail/kos-action-card.tsx
// 🛡️ RECORD-ONLY: bukan booking. Self-contained: useAuth + contact handler.
// Dirender 2x (aside desktop + bar mobile); CSS sembunyiin salah satu per viewport.
// ════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/components/bakos/public/bakos-links';
import { MS, type ListingDetail, type Room } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function PriceLine({ listing }: { listing: ListingDetail }) {
  return (
    <div className="bkd-price">
      <span className="amt">{formatRupiah(listing.price)}</span>
      <span className="per">/{listing.price_period}</span>
      {listing.is_negotiable && <span className="nego">Nego</span>}
    </div>
  );
}

export function KosActionCard({
  listing, rooms, selectedRoom,
}: { listing: ListingDetail; rooms: Room[]; selectedRoom: string | null }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claimNote, setClaimNote] = useState(false);

  const handleContact = async () => {
    if (!user || !token) { router.push(`/login?redirect=/bakos/${listing.slug}`); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings/${listing.id}/contact`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        const room = selectedRoom ? rooms.find((r) => r.id === selectedRoom) : null;
        const msg = encodeURIComponent(`Halo, saya tertarik dengan kos "${listing.title}"${room ? ` (${room.room_type})` : ''}.\n\nKode: ${data.data.tracking_code}\n\n(via TeraLoka)`);
        if (data.data.wa_link) window.open(`${data.data.wa_link}${data.data.wa_link.includes('?') ? '&' : '?'}text=${msg}`, '_blank');
        else if (data.data.owner_phone) window.open(`https://wa.me/${String(data.data.owner_phone).replace(/\D/g, '')}?text=${msg}`, '_blank');
      } else alert(data.error || 'Gagal menghubungi pemilik.');
    } catch { alert('Gagal menghubungi pemilik. Coba lagi.'); }
    finally { setLoading(false); }
  };

  if (success) {
    return <div className="bkd-ok"><strong>✓ WhatsApp sudah dibuka</strong><span>Lanjutkan percakapan dengan pemilik kos</span></div>;
  }
  if (listing.contact_enabled) {
    const roomName = selectedRoom ? rooms.find((r) => r.id === selectedRoom)?.room_type : null;
    return (
      <>
        <button className="bkd-btn primary" onClick={handleContact} disabled={loading}>
          {loading ? 'Menghubungi…' : user
            ? <><MS n="chat" />{roomName ? `Tanya kamar "${roomName}"` : 'Hubungi via WhatsApp'}</>
            : <><MS n="lock" />Login untuk hubungi pemilik</>}
        </button>
        <p className="bkd-micro"><MS n="info" /> BAKOS menghubungkan kamu dengan pemilik. Sewa &amp; pembayaran langsung dengan pemilik.</p>
      </>
    );
  }
  if (listing.is_claimable) {
    return (
      <div className="bkd-note warn">
        <h4><MS n="eco" /> Belum dikelola pemilik</h4>
        <p>Kontak &amp; alamat lengkap muncul setelah pemilik mengaktifkan kos di BAKOS.</p>
        <button className="bkd-btn ghost" style={{ marginTop: 10 }} onClick={() => setClaimNote(true)}>
          Saya pemilik kos ini <MS n="arrow_forward" />
        </button>
        {claimNote && <p className="hint">Fitur klaim kos segera hadir. Sementara, hubungi admin TeraLoka untuk klaim manual.</p>}
      </div>
    );
  }
  return <div className="bkd-note lock"><p><MS n="lock" /> Pemilik belum mengaktifkan kontak</p></div>;
}
