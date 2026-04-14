'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CITIES = ['Ternate', 'Tidore', 'Sofifi', 'Tobelo', 'Labuha', 'Sanana', 'Daruba', 'Weda', 'Maba', 'Buli'];

const SHARED_FACILITIES = [
  'Dapur bersama', 'Ruang tamu', 'Ruang santai', 'Jemuran', 'Tempat cuci',
  'Mushola', 'Taman', 'Area parkir motor', 'Area parkir mobil',
  'CCTV area umum', 'Satpam 24 jam', 'Akses kartu', 'Lift',
];

const ROOM_FACILITIES = [
  'WiFi', 'AC', 'Kamar mandi dalam', 'Kamar mandi luar', 'Dapur pribadi',
  'Listrik token', 'Listrik included', 'Kasur', 'Lemari', 'Meja belajar',
  'Televisi', 'Jendela', 'Balkon', 'Kipas angin', 'Kulkas',
];

const LANDMARKS = [
  'Dekat kampus', 'Dekat sekolah', 'Dekat rumah sakit', 'Dekat pasar',
  'Dekat mall', 'Dekat pelabuhan', 'Dekat kantor pemerintah',
  'Dekat masjid', 'Dekat pusat kota', 'Pinggir jalan utama',
];

const STEPS = ['Info Dasar', 'Fasilitas & Peraturan', 'Tipe Kamar'];

interface RoomType {
  id: string;
  room_type: string;
  description: string;
  price: string;
  price_period: string;
  total_rooms: string;
  available_rooms: string;
  size_m2: string;
  facilities: string[];
  photos: string[];
}

function emptyRoom(): RoomType {
  return {
    id: Date.now().toString() + Math.random(),
    room_type: '',
    description: '',
    price: '',
    price_period: 'bulan',
    total_rooms: '1',
    available_rooms: '1',
    size_m2: '',
    facilities: [],
    photos: [],
  };
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-xl py-2 px-3 text-xs font-medium transition-colors ${active ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  );
}

function KosFormContent() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Info Dasar
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [coverPhotos, setCoverPhotos] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [landmarkCustom, setLandmarkCustom] = useState('');

  // Step 2 — Fasilitas & Peraturan
  const [kosType, setKosType] = useState('');
  const [electricityType, setElectricityType] = useState('');
  const [sharedFacilities, setSharedFacilities] = useState<string[]>([]);
  const [kosRules, setKosRules] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);

  // Step 3 — Tipe Kamar
  const [rooms, setRooms] = useState<RoomType[]>([emptyRoom()]);
  const [expandedRoom, setExpandedRoom] = useState<string>(rooms[0].id);

  const fmt = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  function toggleSharedFacility(f: string) {
    setSharedFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function toggleLandmark(l: string) {
    setLandmarks(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }

  function updateRoom(id: string, field: keyof RoomType, value: any) {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function toggleRoomFacility(id: string, facility: string) {
    setRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const facilities = r.facilities.includes(facility)
        ? r.facilities.filter(f => f !== facility)
        : [...r.facilities, facility];
      return { ...r, facilities };
    }));
  }

  function addRoom() {
    const newRoom = emptyRoom();
    setRooms(prev => [...prev, newRoom]);
    setExpandedRoom(newRoom.id);
  }

  function removeRoom(id: string) {
    if (rooms.length === 1) return;
    setRooms(prev => prev.filter(r => r.id !== id));
  }

  const canNext = [
    title.trim().length >= 5 && !!city && phone.length >= 9,
    !!kosType,
    rooms.every(r => r.room_type.trim() && r.price && Number(r.total_rooms) >= 1),
  ][step];

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const allLandmarks = landmarkCustom.trim()
        ? [...landmarks, landmarkCustom.trim()]
        : landmarks;

      const listingRes = await fetch(`${API}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'kos',
          title, description,
          city_id: city, address,
          phone: phone.replace(/\D/g, ''),
          cover_image_url: coverPhotos[0] ?? null,
          photos: coverPhotos,
          kos_type: kosType,
          electricity_type: electricityType || null,
          facilities: sharedFacilities,
          kos_rules: kosRules || null,
          is_negotiable: isNegotiable,
          nearby_landmarks: allLandmarks,
          price: Math.min(...rooms.map(r => Number(r.price.replace(/\D/g, '')) || 999999999)),
          price_period: 'bulan',
        }),
      });

      const listingData = await listingRes.json();
      if (!listingRes.ok) {
        setError(listingData.error?.message ?? 'Gagal membuat listing.');
        return;
      }

      const listingId = listingData.data?.id;

      await Promise.all(rooms.map(async r => {
        const res = await fetch(`${API}/listings/${listingId}/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            room_type: r.room_type,
            description: r.description || null,
            price: Number(r.price.replace(/\D/g, '')),
            price_period: r.price_period,
            total_rooms: Number(r.total_rooms),
            available_rooms: Number(r.available_rooms),
            size_m2: r.size_m2 ? Number(r.size_m2) : null,
            facilities: r.facilities,
            photos: r.photos,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message ?? 'Gagal simpan tipe kamar');
        return data;
      }));

      setSubmitted(true);
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Login Dulu</h2>
          <button onClick={() => router.push('/login')}
            className="mt-4 rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white">
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Kos-kosan Didaftarkan!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Listing kamu sudah masuk beserta {rooms.length} tipe kamar. Tim TeraLoka akan mengaktifkan dalam 1×24 jam.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => router.push('/owner')}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
              Lihat Dashboard
            </button>
            <button onClick={() => { setSubmitted(false); setStep(0); }}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-2.5 text-sm font-semibold text-white">
              Daftarkan Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">🏠 Daftarkan Kos-kosan</h1>
        <p className="text-sm text-gray-500">Isi info lengkap agar mudah ditemukan calon penghuni</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              i < step ? 'bg-[#1B6B4A] text-white' :
              i === step ? 'border-2 border-[#1B6B4A] text-[#1B6B4A]' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-[#1B6B4A]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-1 text-xs text-gray-500">{STEPS[step]}</span>
      </div>

      {/* ─── Step 1: Info Dasar ─── */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nama Kos-kosan</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Kos Putri Ibu Amber Akehuda"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ceritakan keunggulan kos-kosan kamu, suasana lingkungan, akses transportasi..."
              rows={3} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>

          <ImageUpload
            bucket="listings"
            label="Foto Kos-kosan (tampak luar, area umum, lingkungan)"
            onUpload={(urls: string[]) => setCoverPhotos(urls)}
            existingUrls={coverPhotos}
            maxFiles={5}
          />

          <div>
            <label className="text-sm font-medium text-gray-700">Kota</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CITIES.map(c => <Btn key={c} active={city === c} onClick={() => setCity(c)}>{c}</Btn>)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Alamat Lengkap</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Nama jalan, kelurahan, kecamatan"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Dekat dengan apa? <span className="text-gray-400">(opsional)</span></label>
            <p className="text-xs text-gray-400 mb-1.5">Ini membantu calon penghuni menemukan kos kamu lebih mudah</p>
            <div className="flex flex-wrap gap-2">
              {LANDMARKS.map(l => (
                <Btn key={l} active={landmarks.includes(l)} onClick={() => toggleLandmark(l)}>{l}</Btn>
              ))}
            </div>
            <input type="text" value={landmarkCustom} onChange={e => setLandmarkCustom(e.target.value)}
              placeholder="Tambah landmark lain... (contoh: dekat RSUD Chasan Boesoerie)"
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nomor WA yang bisa dihubungi</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#1B6B4A] mt-1.5">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">+62</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="812 3456 7890"
                className="flex-1 h-12 px-3 text-sm outline-none bg-transparent" />
            </div>
            <p className="mt-1 text-xs text-gray-400">Dilindungi WA relay — tidak ditampilkan langsung ke publik</p>
          </div>
        </div>
      )}

      {/* ─── Step 2: Fasilitas & Peraturan ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Tipe Kos</label>
            <div className="mt-1.5 flex gap-2">
              {['putra', 'putri', 'campur'].map(k => (
                <Btn key={k} active={kosType === k} onClick={() => setKosType(k)}>
                  {k === 'putra' ? '👨 Putra' : k === 'putri' ? '👩 Putri' : '👫 Campur'}
                </Btn>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Listrik</label>
            <div className="mt-1.5 flex gap-2">
              {['Token', 'Included'].map(e => (
                <Btn key={e} active={electricityType === e} onClick={() => setElectricityType(e)}>
                  {e === 'Token' ? '⚡ Token' : '✅ Sudah included'}
                </Btn>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fasilitas Bersama</label>
            <p className="text-xs text-gray-400 mb-1.5">Fasilitas yang bisa dipakai semua penghuni (area umum)</p>
            <div className="flex flex-wrap gap-2">
              {SHARED_FACILITIES.map(f => (
                <Btn key={f} active={sharedFacilities.includes(f)} onClick={() => toggleSharedFacility(f)}>{f}</Btn>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1B6B4A]" />
            <div>
              <p className="text-sm font-medium text-gray-800">Harga bisa nego</p>
              <p className="text-xs text-gray-500">Tampilkan tanda nego di listing kamu</p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700">Peraturan Kos</label>
            <p className="text-xs text-gray-400 mb-1.5">Berlaku untuk seluruh penghuni, terlepas dari tipe kamar</p>
            <textarea value={kosRules} onChange={e => setKosRules(e.target.value)}
              placeholder="Contoh: Tidak boleh bawa tamu menginap, jam malam pk 22.00, tidak boleh masak di kamar, wajib jaga kebersihan area bersama..."
              rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>
        </div>
      )}

      {/* ─── Step 3: Tipe Kamar ─── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              Tambahkan semua tipe kamar yang tersedia. Setiap tipe bisa punya harga, fasilitas, dan foto yang berbeda.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{rooms.length} tipe kamar</p>
            <button onClick={addRoom}
              className="rounded-xl bg-[#1B6B4A] px-3 py-1.5 text-xs font-semibold text-white">
              + Tambah Tipe
            </button>
          </div>

          {rooms.map((room, idx) => (
            <div key={room.id} className="rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedRoom(expandedRoom === room.id ? '' : room.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B6B4A] text-xs font-bold text-white">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {room.room_type || `Tipe Kamar ${idx + 1}`}
                    </p>
                    {room.price && (
                      <p className="text-xs text-gray-400">Rp {room.price}/{room.price_period} · {room.total_rooms} kamar</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rooms.length > 1 && (
                    <span onClick={e => { e.stopPropagation(); removeRoom(room.id); }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1">Hapus</span>
                  )}
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${expandedRoom === room.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedRoom === room.id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nama Tipe Kamar</label>
                    <input type="text" value={room.room_type}
                      onChange={e => updateRoom(room.id, 'room_type', e.target.value)}
                      placeholder="Contoh: Kamar Standar, Kamar AC, Kamar VIP"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
                    <textarea value={room.description}
                      onChange={e => updateRoom(room.id, 'description', e.target.value)}
                      placeholder="Ceritakan keistimewaan kamar ini..."
                      rows={2} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Harga</label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                        <input type="text" value={room.price}
                          onChange={e => updateRoom(room.id, 'price', fmt(e.target.value))}
                          placeholder="500.000"
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Per</label>
                      <div className="mt-1.5 flex gap-1">
                        {['bulan', 'malam', 'hari'].map(p => (
                          <button key={p} onClick={() => updateRoom(room.id, 'price_period', p)}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-colors ${
                              room.price_period === p ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'
                            }`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Total Kamar</label>
                      <input type="number" min="1" value={room.total_rooms}
                        onChange={e => { updateRoom(room.id, 'total_rooms', e.target.value); updateRoom(room.id, 'available_rooms', e.target.value); }}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B6B4A]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Tersedia</label>
                      <input type="number" min="0" value={room.available_rooms}
                        onChange={e => updateRoom(room.id, 'available_rooms', e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B6B4A]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Ukuran (m²)</label>
                      <input type="number" min="1" value={room.size_m2}
                        onChange={e => updateRoom(room.id, 'size_m2', e.target.value)}
                        placeholder="12"
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1B6B4A]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Fasilitas Kamar Ini</label>
                    <p className="text-xs text-gray-400 mb-1.5">Fasilitas yang ada di dalam kamar ini saja</p>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_FACILITIES.map(f => (
                        <button key={f} onClick={() => toggleRoomFacility(room.id, f)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            room.facilities.includes(f) ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>{f}</button>
                      ))}
                    </div>
                  </div>

                  <ImageUpload
                    bucket="listings"
                    label="Foto Kamar Ini"
                    onUpload={(urls: string[]) => updateRoom(room.id, 'photos', urls)}
                    existingUrls={room.photos}
                    maxFiles={5}
                  />
                </div>
              )}
            </div>
          ))}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">
            ← Kembali
          </button>
        )}
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40">
            Lanjut →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canNext || loading}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40">
            {loading ? 'Mendaftarkan...' : `Daftarkan Kos (${rooms.length} tipe kamar)`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KosNewPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-gray-400">Memuat...</p></div>}>
      <KosFormContent />
    </Suspense>
  );
}
