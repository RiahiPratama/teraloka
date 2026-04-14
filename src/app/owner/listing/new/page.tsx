'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const LISTING_TYPES = [
  { key: 'kos', label: 'Kos-kosan', desc: 'Kos-kosan & kontrakan', icon: '🏠' },
  { key: 'properti', label: 'Properti', desc: 'Jual/sewa rumah, tanah, ruko', icon: '🏢' },
  { key: 'kendaraan', label: 'Kendaraan', desc: 'Jual/sewa motor & mobil', icon: '🚗' },
  { key: 'jasa', label: 'Jasa', desc: 'Tukang, teknisi, freelancer', icon: '🔧' },
];

const KOS_FACILITIES = [
  'WiFi', 'AC', 'Kamar mandi dalam', 'Dapur', 'Parkir motor',
  'Parkir mobil', 'Listrik token', 'Air PDAM', 'Kasur', 'Lemari',
  'Meja belajar', 'Televisi', 'Laundry', 'CCTV', 'Keamanan 24 jam',
];

const SERVICE_CATEGORIES = [
  'Tukang bangunan', 'Teknisi listrik', 'Teknisi AC', 'Plumber',
  'Desain interior', 'Fotografer', 'Videografer', 'Driver/ojek',
  'Cleaning service', 'Catering', 'Wedding organizer', 'Guru les',
  'IT & komputer', 'Salon & kecantikan', 'Lainnya',
];

const CITIES = [
  'Ternate', 'Tidore', 'Sofifi', 'Tobelo', 'Labuha',
  'Sanana', 'Daruba', 'Weda', 'Maba', 'Buli',
];

function NewListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();

  const typeParam = searchParams.get('type') ?? '';
  const validTypes = ['kos', 'properti', 'kendaraan', 'jasa'];
  const initialType = validTypes.includes(typeParam) ? typeParam : '';
  const initialStep = initialType ? 1 : 0;

  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [transactionType, setTransactionType] = useState('');

  const [kosType, setKosType] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [roomAvailable, setRoomAvailable] = useState('1');
  const [propertyType, setPropertyType] = useState('');
  const [landArea, setLandArea] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleCondition, setVehicleCondition] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Login Dulu</h2>
          <p className="mt-1 text-sm text-gray-500 mb-4">Kamu harus login untuk menambah listing.</p>
          <button onClick={() => router.push('/login')}
            className="rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white">
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
          <h2 className="text-lg font-semibold text-gray-900">Listing Ditambahkan!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Listing kamu sudah masuk sebagai draft. Tim TeraLoka akan mengaktifkan dalam 1x24 jam.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => router.push('/owner')}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
              Lihat Dashboard
            </button>
            <button onClick={() => { setSubmitted(false); setStep(initialStep); setType(initialType); setTitle(''); setDescription(''); setCity(''); setAddress(''); setPhone(''); setPrice(''); setTransactionType(''); setFacilities([]); }}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-2.5 text-sm font-semibold text-white">
              Tambah Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleFacility = (f: string) => setFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const fmt = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload: Record<string, any> = { type, title, description, city_id: city, address, phone: phone.replace(/\D/g, ''), price: Number(price.replace(/\D/g, '')) || null, transaction_type: transactionType || null, price_period: type === 'kos' ? 'bulan' : null };
      if (type === 'kos') { payload.kos_type = kosType; payload.facilities = facilities; payload.room_available = Number(roomAvailable); }
      else if (type === 'properti') { payload.property_type = propertyType; payload.land_area_m2 = landArea ? Number(landArea) : null; payload.building_area_m2 = buildingArea ? Number(buildingArea) : null; }
      else if (type === 'kendaraan') { payload.vehicle_type = vehicleType; payload.vehicle_brand = vehicleBrand; payload.vehicle_year = vehicleYear ? Number(vehicleYear) : null; payload.vehicle_condition = vehicleCondition; }
      else if (type === 'jasa') { payload.service_category = serviceCategory; payload.service_area = serviceArea; }

      const res = await fetch(`${API}/listings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { setSubmitted(true); } else { setError(data.error?.message ?? 'Gagal menambah listing.'); }
    } catch { setError('Koneksi bermasalah. Coba lagi.'); }
    finally { setLoading(false); }
  };

  const canNext = [!!type, title.trim().length >= 5 && !!city && phone.length >= 9, type === 'kos' ? (!!kosType && !!price) : type === 'properti' ? (!!propertyType && !!transactionType && !!price) : type === 'kendaraan' ? (!!vehicleType && !!vehicleBrand && !!transactionType && !!price) : type === 'jasa' ? !!serviceCategory : false][step];
  const STEPS = ['Tipe', 'Info Dasar', 'Detail'];
  const currentType = LISTING_TYPES.find(t => t.key === type);
  const headerTitle = type === 'kos' ? 'Daftarkan Kos-kosan' : type === 'properti' ? 'Daftarkan Properti' : type === 'kendaraan' ? 'Daftarkan Kendaraan' : type === 'jasa' ? 'Daftarkan Jasa Kamu' : 'Tambah Listing Baru';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">{type ? `${currentType?.icon} ${headerTitle}` : headerTitle}</h1>
        <p className="text-sm text-gray-500">{type ? currentType?.desc : 'Pilih tipe listing yang ingin kamu daftarkan'}</p>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i < step ? 'bg-[#1B6B4A] text-white' : i === step ? 'border-2 border-[#1B6B4A] text-[#1B6B4A]' : 'bg-gray-100 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-10 ${i < step ? 'bg-[#1B6B4A]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-500">{STEPS[step]}</span>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {LISTING_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${type === t.key ? 'border-[#1B6B4A] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <p className="text-2xl mb-2">{t.icon}</p>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Judul Listing</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === 'kos' ? 'Contoh: Kos Putri Akehuda dekat Kampus UNKHAIR' : type === 'properti' ? 'Contoh: Rumah 3 Kamar di BTN Ternate' : type === 'kendaraan' ? 'Contoh: Honda Beat 2022 Mulus' : 'Contoh: Tukang Listrik Berpengalaman Ternate'}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ceritakan lebih detail..." rows={4}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Kota</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CITIES.map(c => (
                <button key={c} onClick={() => setCity(c)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${city === c ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Alamat Lengkap</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Nama jalan, kelurahan, kecamatan"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Nomor WA yang bisa dihubungi</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#1B6B4A] mt-1.5">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">+62</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="812 3456 7890"
                className="flex-1 h-12 px-3 text-sm outline-none bg-transparent" />
            </div>
            <p className="mt-1 text-xs text-gray-400">Dilindungi WA relay — tidak ditampilkan langsung ke publik</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {type === 'kos' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipe Kos</label>
                <div className="mt-1.5 flex gap-2">
                  {['putra', 'putri', 'campur'].map(k => (
                    <button key={k} onClick={() => setKosType(k)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-colors ${kosType === k ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {k === 'putra' ? '👨 Putra' : k === 'putri' ? '👩 Putri' : '👫 Campur'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Harga per Bulan</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input type="text" value={price} onChange={e => setPrice(fmt(e.target.value))} placeholder="800.000"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Kamar Tersedia</label>
                <input type="number" value={roomAvailable} onChange={e => setRoomAvailable(e.target.value)} min="1" max="100"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fasilitas</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {KOS_FACILITIES.map(f => (
                    <button key={f} onClick={() => toggleFacility(f)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${facilities.includes(f) ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {type === 'properti' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipe Properti</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {['Rumah', 'Apartemen', 'Ruko', 'Tanah', 'Kos', 'Gudang'].map(p => (
                    <button key={p} onClick={() => setPropertyType(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${propertyType === p ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Jenis Transaksi</label>
                <div className="mt-1.5 flex gap-2">
                  {['jual', 'sewa'].map(t => (
                    <button key={t} onClick={() => setTransactionType(t)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${transactionType === t ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {t === 'jual' ? '💰 Dijual' : '🔑 Disewa'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Harga {transactionType === 'sewa' ? '/ Tahun' : ''}</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input type="text" value={price} onChange={e => setPrice(fmt(e.target.value))} placeholder="500.000.000"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Luas Tanah (m²)</label>
                  <input type="number" value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="100"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Luas Bangunan (m²)</label>
                  <input type="number" value={buildingArea} onChange={e => setBuildingArea(e.target.value)} placeholder="80"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
              </div>
            </>
          )}
          {type === 'kendaraan' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Jenis Kendaraan</label>
                <div className="mt-1.5 flex gap-2">
                  {['motor', 'mobil', 'pickup', 'truk'].map(v => (
                    <button key={v} onClick={() => setVehicleType(v)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-colors ${vehicleType === v ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {v === 'motor' ? '🏍️' : v === 'mobil' ? '🚗' : v === 'pickup' ? '🛻' : '🚛'} {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Jenis Transaksi</label>
                <div className="mt-1.5 flex gap-2">
                  {['jual', 'sewa'].map(t => (
                    <button key={t} onClick={() => setTransactionType(t)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${transactionType === t ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {t === 'jual' ? '💰 Dijual' : '🔑 Disewa'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Merk / Model</label>
                  <input type="text" value={vehicleBrand} onChange={e => setVehicleBrand(e.target.value)} placeholder="Honda Beat"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tahun</label>
                  <input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2022" min="1990" max={new Date().getFullYear()}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Kondisi</label>
                <div className="mt-1.5 flex gap-2">
                  {['baru', 'bekas'].map(c => (
                    <button key={c} onClick={() => setVehicleCondition(c)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-colors ${vehicleCondition === c ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {c === 'baru' ? '✨ Baru' : '🔧 Bekas'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Harga {transactionType === 'sewa' ? '/ Hari' : ''}</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input type="text" value={price} onChange={e => setPrice(fmt(e.target.value))} placeholder="15.000.000"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
              </div>
            </>
          )}
          {type === 'jasa' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Kategori Jasa</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {SERVICE_CATEGORIES.map(s => (
                    <button key={s} onClick={() => setServiceCategory(s)}
                      className={`rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${serviceCategory === s ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Area Layanan</label>
                <input type="text" value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder="Contoh: Ternate Selatan, Ternate Tengah"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tarif <span className="text-gray-400">(opsional)</span></label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input type="text" value={price} onChange={e => setPrice(fmt(e.target.value))} placeholder="200.000"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
                </div>
                <p className="mt-1 text-xs text-gray-400">Kosongkan jika tarif negosiasi</p>
              </div>
            </>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

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
            {loading ? 'Menyimpan...' : 'Tambah Listing'}
          </button>
        )}
      </div>
    </div>
  );
}

import { Suspense } from 'react';
export default function NewListingPage() {
  return <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-gray-400">Memuat...</p></div>}><NewListingContent /></Suspense>;
}
