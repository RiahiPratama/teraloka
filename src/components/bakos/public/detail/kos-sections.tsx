'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Content sections (presentational)
// PATH: src/components/bakos/public/detail/kos-sections.tsx
// Tentang · Trust · Fasilitas+Spec · Tipe Kamar · Lokasi(+pin) · Aturan(+tristate) · Ulasan
// ════════════════════════════════════════════════════════════════
import dynamic from 'next/dynamic';
import { facList, formatRupiah } from '@/components/bakos/public/bakos-links';
import { MS, facIcon, facLabel, type ListingDetail, type Room } from './types';
import { PriceLine } from './kos-action-card';

// 🛡️ Map single-pin dynamic(ssr:false) — Leaflet pecah di SSR.
const KosDetailMap = dynamic(() => import('./KosDetailMap'), {
  ssr: false,
  loading: () => <div style={{ height: 220, borderRadius: 12, background: '#EDEAE1' }} />,
});

// Render satu aturan tristate (cuma kalau owner sudah nyatakan).
function RuleRow({ label, value }: { label: string; value: boolean | null }) {
  if (value == null) return null; // belum dinyatakan → tidak ditampilkan
  return (
    <div className={`bkd-rule${value ? '' : ' no'}`}>
      <MS n={value ? 'check_circle' : 'cancel'} />
      <span>{value ? `Boleh ${label}` : `Tidak boleh ${label}`}</span>
    </div>
  );
}

export function KosSections({
  listing, rooms, selectedRoom, onSelectRoom,
}: {
  listing: ListingDetail; rooms: Room[];
  selectedRoom: string | null; onSelectRoom: (id: string | null) => void;
}) {
  const facs = facList(listing.facilities);
  const landmarks = listing.nearby_landmarks
    ? (Array.isArray(listing.nearby_landmarks) ? listing.nearby_landmarks : [listing.nearby_landmarks])
    : [];
  const hasRules = listing.couple_allowed != null || listing.children_allowed != null || listing.pets_allowed != null;
  const hasPin = listing.latitude != null && listing.longitude != null;

  return (
    <>
      {/* price (mobile only) */}
      <div className="bkd-sec bkd-price-head" style={{ borderBottom: 'none', paddingBottom: 8 }}>
        <PriceLine listing={listing} />
        {!listing.address && listing.area && (
          <p className="bkd-locknote"><MS n="lock" /> Alamat lengkap tampil setelah pemilik mengaktifkan kos</p>
        )}
      </div>

      {/* Tentang */}
      {listing.description && (
        <div className="bkd-sec" id="sec-tentang">
          <h2>Tentang Kos</h2>
          <p className="bkd-desc">{listing.description}</p>
        </div>
      )}

      {/* Trust */}
      <div className="bkd-sec" style={{ borderBottom: 'none', paddingBottom: 8 }}>
        <div className="bkd-trust">
          <h3><MS n="shield" /> Aman &amp; langsung lewat BAKOS</h3>
          <div className="row"><MS n="chat" /><div><p className="tt">Kontak langsung pemilik</p><p className="ds">Hubungi via WhatsApp — tanpa calo, tanpa perantara.</p></div></div>
          <div className="row"><MS n="verified_user" /><div><p className="tt">Pemilik diverifikasi</p><p className="ds">Kos diverifikasi tim TeraLoka sebelum dikelola pemilik.</p></div></div>
          <div className="row"><MS n="handshake" /><div><p className="tt">Sewa langsung dengan pemilik</p><p className="ds">BAKOS bantu temukan &amp; hubungkan. Pembayaran sewa langsung ke pemilik — BAKOS tidak memungut biaya sewa.</p></div></div>
        </div>
      </div>

      {/* Fasilitas + spesifikasi */}
      <div className="bkd-sec" id="sec-fasilitas">
        <h2>Fasilitas &amp; Spesifikasi</h2>
        <div className="bkd-spec">
          {listing.kos_type && <span className="it" style={{ textTransform: 'capitalize' }}><MS n="group" /> Kos {listing.kos_type}</span>}
          {listing.room_size_m2 && <span className="it"><MS n="straighten" /> {listing.room_size_m2} m²</span>}
          {listing.electricity_type && <span className="it"><MS n="bolt" /> {listing.electricity_type}</span>}
        </div>
        {facs.length > 0 ? (
          <div className="bkd-facs">
            {facs.map((f, i) => (
              <div className="bkd-fac" key={i}><span className="ic"><MS n={facIcon(f)} /></span> {facLabel(f)}</div>
            ))}
          </div>
        ) : <p className="bkd-empty">Info fasilitas belum tersedia.</p>}
      </div>

      {/* Tipe Kamar */}
      {listing.has_room_types && rooms.length > 0 && (
        <div className="bkd-sec" id="sec-kamar">
          <h2>Tipe Kamar</h2>
          <div className="bkd-rooms">
            {rooms.map((room) => (
              <div key={room.id} className={`bkd-room${selectedRoom === room.id ? ' on' : ''}`}
                onClick={() => onSelectRoom(room.id === selectedRoom ? null : room.id)}>
                <div className="bkd-room-h">
                  <span className="nm">{room.room_type}</span>
                  <span className={`bkd-room-av ${room.available_rooms > 0 ? 'ok' : 'no'}`}>
                    {room.available_rooms > 0 ? `${room.available_rooms} tersedia` : 'Penuh'}
                  </span>
                </div>
                <div className="bkd-room-pr">{formatRupiah(room.price)}<span className="per">/{room.price_period}</span></div>
                <div className="bkd-room-tags">
                  {room.size_m2 && <span className="bkd-tag">{room.size_m2} m²</span>}
                  {room.facilities?.slice(0, 4).map((f, i) => <span key={i} className="bkd-tag">{f}</span>)}
                  {(room.facilities?.length || 0) > 4 && <span className="bkd-tag">+{room.facilities.length - 4}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lokasi */}
      <div className="bkd-sec" id="sec-lokasi">
        <h2>Lokasi</h2>
        <p className="bkd-loc"><MS n="location_on" /> {listing.address || listing.area || 'Lokasi belum tersedia'}</p>
        {!listing.address && <p className="bkd-locsub"><MS n="lock" /> Titik presisi &amp; alamat lengkap tampil setelah pemilik mengaktifkan kos</p>}
        {hasPin && (
          <div style={{ marginTop: 12 }}>
            <KosDetailMap lat={listing.latitude as number} lng={listing.longitude as number} />
          </div>
        )}
        {landmarks.length > 0 && (
          <div className="bkd-landmarks">
            {landmarks.map((l, i) => <span className="bkd-lm" key={i}><MS n="near_me" /> {l}</span>)}
          </div>
        )}
      </div>

      {/* Aturan */}
      {(hasRules || listing.kos_rules) && (
        <div className="bkd-sec">
          <h2>Peraturan Kos</h2>
          {hasRules && (
            <div className="bkd-rules">
              <RuleRow label="pasutri (suami-istri)" value={listing.couple_allowed} />
              <RuleRow label="bawa anak" value={listing.children_allowed} />
              <RuleRow label="bawa hewan" value={listing.pets_allowed} />
            </div>
          )}
          {listing.kos_rules && <p className="bkd-desc" style={{ whiteSpace: 'pre-line' }}>{listing.kos_rules}</p>}
        </div>
      )}

      {/* Ulasan */}
      <div className="bkd-sec" id="sec-ulasan" style={{ borderBottom: 'none' }}>
        <h2>Ulasan</h2>
        {listing.rating_count > 0 ? (
          <div className="bkd-revsum"><MS n="star" /><span className="big">{listing.rating_avg.toFixed(1)}</span><span style={{ color: 'var(--mut)', fontWeight: 600 }}>dari {listing.rating_count} ulasan</span></div>
        ) : <p className="bkd-empty">Belum ada ulasan untuk kos ini.</p>}
      </div>
    </>
  );
}
