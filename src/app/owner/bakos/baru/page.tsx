'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Tambah Kos (form 3-step)
// PATH: src/app/owner/bakos/baru/page.tsx
// PENANDA: L5-FE-OWNER-BARU
// ────────────────────────────────────────────────────────────────
// Rewire dari owner/listing/new/kos (deprecated):
//   - useApi (token auto) ganti fetch manual
//   - endpoint /bakos/owner/listings + /:id/rooms (createKos, owner-scoped)
//   - kirim electricity_type + kos_rules (backend sudah terima)
//   - warna amber konsisten dashboard owner/bakos
// 🛡️ Kamar di-submit SEQUENTIAL — createKosRoom cek cap kamar kumulatif,
//    submit paralel bisa race guard cap.
// ════════════════════════════════════════════════════════════════

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import ImageUpload from '@/components/ui/ImageUpload';
import { GeographicScopePicker, type LocationScope, type LocationBreadcrumb } from '@/components/shared/locations';

const BRAND = '#854F0B'; // ganti ke '#1B6B4A' kalau mau hijau

const SHARED_FACILITIES = ['Dapur bersama', 'Ruang tamu', 'Ruang santai', 'Jemuran', 'Tempat cuci', 'Mushola', 'Taman', 'Area parkir motor', 'Area parkir mobil', 'CCTV area umum', 'Satpam 24 jam'];
const ROOM_FACILITIES = ['WiFi', 'AC', 'Kamar mandi dalam', 'Kamar mandi luar', 'Kloset duduk', 'Kloset jongkok', 'Shower', 'Water heater', 'Dapur pribadi', 'Kasur', 'Lemari', 'Meja belajar', 'Televisi', 'Jendela', 'Balkon', 'Kipas angin', 'Kulkas'];
const LANDMARKS = ['Dekat kampus', 'Dekat sekolah', 'Dekat rumah sakit', 'Dekat pasar', 'Dekat mall', 'Dekat pelabuhan', 'Dekat kantor pemerintah', 'Dekat masjid', 'Dekat pusat kota', 'Pinggir jalan utama'];
const STEPS = ['Info Dasar', 'Fasilitas & Peraturan', 'Tipe Kamar'];

interface RoomType {
  id: string; room_type: string; description: string; price: string; price_period: string;
  total_rooms: string; available_rooms: string; size_m2: string; facilities: string[]; photos: string[];
}
function emptyRoom(): RoomType {
  return { id: Date.now().toString() + Math.random(), room_type: '', description: '', price: '', price_period: 'bulan', total_rooms: '1', available_rooms: '1', size_m2: '', facilities: [], photos: [] };
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl py-2 px-3 text-xs font-medium transition-colors"
      style={active ? { background: BRAND, color: '#fff' } : { background: '#F1EFE8', color: '#5F5E5A' }}>
      {children}
    </button>
  );
}

function TriRuleBaru({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const set = (v: boolean) => onChange(value === v ? null : v);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <span className="text-sm text-gray-800">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        <button type="button" onClick={() => set(true)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95"
          style={value === true ? { background: '#15803D', color: '#fff', borderColor: '#15803D' } : { background: '#fff', borderColor: '#e5e7eb', color: '#5F5E5A' }}>Boleh</button>
        <button type="button" onClick={() => set(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95"
          style={value === false ? { background: '#B91C1C', color: '#fff', borderColor: '#B91C1C' } : { background: '#fff', borderColor: '#e5e7eb', color: '#5F5E5A' }}>Tidak</button>
      </div>
    </div>
  );
}

function KosFormContent() {
  const router = useRouter();
  const { user } = useAuth();
  const api = useApi();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<LocationScope | null>(null);
  const [scopeLabel, setScopeLabel] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [coverPhotos, setCoverPhotos] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [landmarkCustom, setLandmarkCustom] = useState('');

  const [kosType, setKosType] = useState('');
  const [electricityType, setElectricityType] = useState('');
  const [sharedFacilities, setSharedFacilities] = useState<string[]>([]);
  const [kosRules, setKosRules] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [coupleAllowed, setCoupleAllowed] = useState<boolean | null>(null);
  const [childrenAllowed, setChildrenAllowed] = useState<boolean | null>(null);
  const [petsAllowed, setPetsAllowed] = useState<boolean | null>(null);

  const [rooms, setRooms] = useState<RoomType[]>([emptyRoom()]);
  const [expandedRoom, setExpandedRoom] = useState<string>(rooms[0].id);

  const fmt = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const toggleSharedFacility = (f: string) => setSharedFacilities(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  const toggleLandmark = (l: string) => setLandmarks(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const updateRoom = (id: string, field: keyof RoomType, value: any) => setRooms(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));
  const toggleRoomFacility = (id: string, f: string) => setRooms(p => p.map(r => r.id !== id ? r : { ...r, facilities: r.facilities.includes(f) ? r.facilities.filter(x => x !== f) : [...r.facilities, f] }));
  function addRoom() { const n = emptyRoom(); setRooms(p => [...p, n]); setExpandedRoom(n.id); }
  function removeRoom(id: string) { if (rooms.length === 1) return; setRooms(p => p.filter(r => r.id !== id)); }

  const canNext = [
    title.trim().length >= 5 && !!scope && phone.length >= 9,
    !!kosType,
    rooms.every(r => r.room_type.trim() && r.price && Number(r.total_rooms) >= 1),
  ][step];

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const allLandmarks = landmarkCustom.trim() ? [...landmarks, landmarkCustom.trim()] : landmarks;
      const created = await api.post<{ id: string }>('/bakos/owner/listings', {
        title, description,
        location_id: scope?.id ?? null,
        address,
        phone: phone.replace(/\D/g, ''),
        cover_image_url: coverPhotos[0] ?? null,
        photos: coverPhotos,
        kos_type: kosType,
        electricity_type: electricityType || null,
        facilities: sharedFacilities,
        kos_rules: kosRules || null,
        is_negotiable: isNegotiable,
        couple_allowed: coupleAllowed,
        children_allowed: childrenAllowed,
        pets_allowed: petsAllowed,
        nearby_landmarks: allLandmarks,
        price: Math.min(...rooms.map(r => Number(r.price.replace(/\D/g, '')) || 999999999)),
        price_period: 'bulan',
      });

      const listingId = created.id;

      // 🛡️ SEQUENTIAL — cap kamar dicek kumulatif tiap add.
      for (const r of rooms) {
        await api.post(`/bakos/owner/listings/${listingId}/rooms`, {
          room_type: r.room_type,
          description: r.description || null,
          price: Number(r.price.replace(/\D/g, '')),
          price_period: r.price_period,
          total_rooms: Number(r.total_rooms),
          available_rooms: Number(r.available_rooms),
          size_m2: r.size_m2 ? Number(r.size_m2) : null,
          facilities: r.facilities,
          photos: r.photos,
        });
      }

      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Login Dulu</h2>
          <button onClick={() => router.push('/login?redirect=/owner/bakos/baru')}
            className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>
            Login sekarang
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#FAEEDA' }}>
            <svg className="h-8 w-8" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Kos Didaftarkan!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Listing kamu masuk beserta {rooms.length} tipe kamar. Tim TeraLoka akan verifikasi & menayangkan dalam 1×24 jam.
            Kontak baru terbuka setelah kamu berlangganan.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => router.push('/owner/bakos')}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">Ke Dashboard</button>
            <button onClick={() => { setSubmitted(false); setStep(0); }}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>Daftar Lagi</button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = 'mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#854F0B]';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <button onClick={() => router.push('/owner/bakos')} className="mb-2 text-xs text-gray-400">← Kos Saya</button>
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: BRAND }}>🏠 Daftarkan Kos</h1>
        <p className="text-sm text-gray-500">Isi info lengkap agar mudah ditemukan calon penghuni</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
              style={i < step ? { background: BRAND, color: '#fff' } : i === step ? { border: `2px solid ${BRAND}`, color: BRAND } : { background: '#F1EFE8', color: '#9ca3af' }}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 w-8" style={{ background: i < step ? BRAND : '#e5e7eb' }} />}
          </div>
        ))}
        <span className="ml-1 text-xs text-gray-500">{STEPS[step]}</span>
      </div>

      {/* Step 1 */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nama Kos</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Kos Putri Ibu Amber Akehuda" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Keunggulan kos, suasana lingkungan, akses transportasi..." rows={3} className={inputCls} />
          </div>
          <ImageUpload bucket="listings" label="Foto Kos (tampak luar, area umum, lingkungan)" onUpload={(urls: string[]) => setCoverPhotos(urls)} existingUrls={coverPhotos} maxFiles={5} />
          <div>
            <label className="text-sm font-medium text-gray-700">Lokasi Kos (Kelurahan/Desa)</label>
            <p className="text-xs text-gray-400 mb-1.5">Cari & pilih kelurahan kos kamu — dipakai untuk peta sebaran & pencarian area</p>
            <div className="mt-1.5">
              <GeographicScopePicker
                value={scope}
                onChange={(s, bc?: LocationBreadcrumb) => { setScope(s); setScopeLabel(bc?.display_short ?? s?.type ?? ''); }}
                allowedTypes={['kelurahan', 'desa']}
                allowGps
                brandColor={BRAND}
                placeholder="Cari kelurahan / desa..."
              />
            </div>
            {scopeLabel && <p className="mt-1 text-xs" style={{ color: BRAND }}>📍 {scopeLabel}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Alamat Lengkap <span className="text-gray-400">(opsional)</span></label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Nama jalan & nomor (disembunyikan dari publik sampai kamu berlangganan)" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Dekat dengan apa? <span className="text-gray-400">(opsional)</span></label>
            <p className="text-xs text-gray-400 mb-1.5">Bantu calon penghuni nemu kos kamu lebih mudah</p>
            <div className="flex flex-wrap gap-2">{LANDMARKS.map(l => <Btn key={l} active={landmarks.includes(l)} onClick={() => toggleLandmark(l)}>{l}</Btn>)}</div>
            <input type="text" value={landmarkCustom} onChange={e => setLandmarkCustom(e.target.value)} placeholder="Tambah lain... (contoh: dekat RSUD Chasan Boesoerie)" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#854F0B]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Nomor WA yang bisa dihubungi</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#854F0B] mt-1.5">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">+62</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="812 3456 7890" className="flex-1 h-12 px-3 text-sm outline-none bg-transparent" />
            </div>
            <p className="mt-1 text-xs text-gray-400">Dilindungi WA relay — tidak ditampilkan langsung ke publik</p>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Tipe Kos</label>
            <div className="mt-1.5 flex gap-2">{['putra', 'putri', 'campur'].map(k => <Btn key={k} active={kosType === k} onClick={() => setKosType(k)}>{k === 'putra' ? '👨 Putra' : k === 'putri' ? '👩 Putri' : '👫 Campur'}</Btn>)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Listrik</label>
            <div className="mt-1.5 flex gap-2">{['Token', 'Included'].map(e => <Btn key={e} active={electricityType === e} onClick={() => setElectricityType(e)}>{e === 'Token' ? '⚡ Token' : '✅ Included'}</Btn>)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Fasilitas Bersama</label>
            <p className="text-xs text-gray-400 mb-1.5">Yang bisa dipakai semua penghuni (area umum)</p>
            <div className="flex flex-wrap gap-2">{SHARED_FACILITIES.map(f => <Btn key={f} active={sharedFacilities.includes(f)} onClick={() => toggleSharedFacility(f)}>{f}</Btn>)}</div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: BRAND }} />
            <div><p className="text-sm font-medium text-gray-800">Harga bisa nego</p><p className="text-xs text-gray-500">Tampilkan tanda nego di listing</p></div>
          </label>
          <div>
            <label className="text-sm font-medium text-gray-700">Boleh Pasutri / Anak / Hewan?</label>
            <p className="text-xs text-gray-400 mb-1.5">Dipakai untuk filter pencarian. Tidak dipilih = belum dinyatakan.</p>
            <div className="space-y-2">
              <TriRuleBaru label="Pasutri (suami-istri)" value={coupleAllowed} onChange={setCoupleAllowed} />
              <TriRuleBaru label="Bawa anak" value={childrenAllowed} onChange={setChildrenAllowed} />
              <TriRuleBaru label="Bawa hewan" value={petsAllowed} onChange={setPetsAllowed} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Peraturan Kos</label>
            <p className="text-xs text-gray-400 mb-1.5">Berlaku untuk seluruh penghuni</p>
            <textarea value={kosRules} onChange={e => setKosRules(e.target.value)} placeholder="Contoh: Tidak boleh bawa tamu menginap, jam malam 22.00, wajib jaga kebersihan area bersama..." rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#854F0B]" />
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3"><p className="text-xs text-blue-700 leading-relaxed">Tambahkan semua tipe kamar yang tersedia. Tiap tipe bisa beda harga, fasilitas, dan foto.</p></div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{rooms.length} tipe kamar</p>
            <button onClick={addRoom} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ background: BRAND }}>+ Tambah Tipe</button>
          </div>
          {rooms.map((room, idx) => (
            <div key={room.id} className="rounded-2xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedRoom(expandedRoom === room.id ? '' : room.id)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: BRAND }}>{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{room.room_type || `Tipe Kamar ${idx + 1}`}</p>
                    {room.price && <p className="text-xs text-gray-400">Rp {room.price}/{room.price_period} · {room.total_rooms} kamar</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rooms.length > 1 && <span onClick={e => { e.stopPropagation(); removeRoom(room.id); }} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">Hapus</span>}
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${expandedRoom === room.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              {expandedRoom === room.id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nama Tipe Kamar</label>
                    <input type="text" value={room.room_type} onChange={e => updateRoom(room.id, 'room_type', e.target.value)} placeholder="Contoh: Kamar Standar, Kamar AC, VIP" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
                    <textarea value={room.description} onChange={e => updateRoom(room.id, 'description', e.target.value)} placeholder="Keistimewaan kamar ini..." rows={2} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Harga</label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                        <input type="text" value={room.price} onChange={e => updateRoom(room.id, 'price', fmt(e.target.value))} placeholder="500.000" className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#854F0B]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Per</label>
                      <div className="mt-1.5 flex gap-1">{['bulan', 'malam', 'hari'].map(p => (
                        <button key={p} onClick={() => updateRoom(room.id, 'price_period', p)} className="flex-1 rounded-xl py-2.5 text-xs font-medium capitalize" style={room.price_period === p ? { background: BRAND, color: '#fff' } : { background: '#F1EFE8', color: '#5F5E5A' }}>{p}</button>
                      ))}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs font-medium text-gray-700">Total Kamar</label><input type="number" min="1" value={room.total_rooms} onChange={e => { updateRoom(room.id, 'total_rooms', e.target.value); updateRoom(room.id, 'available_rooms', e.target.value); }} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#854F0B]" /></div>
                    <div><label className="text-xs font-medium text-gray-700">Tersedia</label><input type="number" min="0" value={room.available_rooms} onChange={e => updateRoom(room.id, 'available_rooms', e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#854F0B]" /></div>
                    <div><label className="text-xs font-medium text-gray-700">Ukuran (m²)</label><input type="number" min="1" value={room.size_m2} onChange={e => updateRoom(room.id, 'size_m2', e.target.value)} placeholder="12" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#854F0B]" /></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fasilitas Kamar Ini</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">{ROOM_FACILITIES.map(f => (
                      <button key={f} onClick={() => toggleRoomFacility(room.id, f)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={room.facilities.includes(f) ? { background: BRAND, color: '#fff' } : { background: '#F1EFE8', color: '#5F5E5A' }}>{f}</button>
                    ))}</div>
                  </div>
                  <ImageUpload bucket="listings" label="Foto Kamar Ini" onUpload={(urls: string[]) => updateRoom(room.id, 'photos', urls)} existingUrls={room.photos} maxFiles={5} />
                </div>
              )}
            </div>
          ))}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Nav */}
      <div className="mt-6 flex gap-2">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">← Kembali</button>}
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: BRAND }}>Lanjut →</button>
        ) : (
          <button onClick={handleSubmit} disabled={!canNext || loading} className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: BRAND }}>{loading ? 'Mendaftarkan...' : `Daftarkan Kos (${rooms.length} tipe)`}</button>
        )}
      </div>
    </div>
  );
}

export default function KosBaruPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-gray-400">Memuat...</p></div>}>
      <KosFormContent />
    </Suspense>
  );
}
