'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Suspense } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';

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

const PROPERTY_FACILITIES = [
  'Listrik PLN', 'Air PDAM', 'Garasi', 'Carport', 'Dapur',
  'AC', 'Water heater', 'Pagar', 'Taman', 'Kolam renang',
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

const STEPS = ['Tipe', 'Info Dasar', 'Detail'];

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl py-2.5 px-3 text-xs font-medium transition-colors ${active ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  );
}

function Input({ label, optional, ...props }: { label: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label} {optional && <span className="text-gray-400">(opsional)</span>}</label>
      <input {...props} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1B6B4A]" />
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
    </label>
  );
}

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

  // Common
  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  // Kos
  const [kosType, setKosType] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [roomAvailable, setRoomAvailable] = useState('1');
  const [roomSizeM2, setRoomSizeM2] = useState('');
  const [electricityType, setElectricityType] = useState('');
  const [kosRules, setKosRules] = useState('');

  // Properti
  const [propertyType, setPropertyType] = useState('');
  const [landArea, setLandArea] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [bedroomCount, setBedroomCount] = useState('');
  const [bathroomCount, setBathroomCount] = useState('');
  const [propertyCondition, setPropertyCondition] = useState('');
  const [isFurnished, setIsFurnished] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [minRentalPeriod, setMinRentalPeriod] = useState('');
  const [certificateType, setCertificateType] = useState('');
  const [landContour, setLandContour] = useState('');
  const [landAccess, setLandAccess] = useState(true);
  const [landPurpose, setLandPurpose] = useState('');
  const [propFacilities, setPropFacilities] = useState<string[]>([]);

  // Kendaraan
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleCondition, setVehicleCondition] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [engineCc, setEngineCc] = useState('');
  const [includesDriver, setIncludesDriver] = useState(false);
  const [minRentDays, setMinRentDays] = useState('1');

  // Jasa
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Login Dulu</h2>
          <p className="mt-1 text-sm text-gray-500 mb-4">Kamu harus login untuk menambah listing.</p>
          <button onClick={() => router.push('/login')} className="rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white">Login sekarang</button>
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
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">Listing kamu sudah masuk sebagai draft. Tim TeraLoka akan mengaktifkan dalam 1x24 jam.</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => router.push('/owner')} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">Lihat Dashboard</button>
            <button onClick={() => { setSubmitted(false); setStep(initialStep); setType(initialType); setTitle(''); setDescription(''); setCity(''); setAddress(''); setPhone(''); setPrice(''); setTransactionType(''); setFacilities([]); setPropFacilities([]); setIsNegotiable(false); setCoverUrl(''); }}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-2.5 text-sm font-semibold text-white">Tambah Lagi</button>
          </div>
        </div>
      </div>
    );
  }

  const toggleFacility = (f: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(f) ? list.filter(x => x !== f) : [...list, f]);

  const fmt = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const isLand = propertyType === 'Tanah';

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload: Record<string, any> = {
        type, title, description,
        city_id: city, address,
        phone: phone.replace(/\D/g, ''),
        price: Number(price.replace(/\D/g, '')) || null,
        transaction_type: transactionType || null,
        price_period: type === 'kos' ? 'bulan' : null,
        is_negotiable: isNegotiable,
        cover_image_url: coverUrl || null,
      };

      if (type === 'kos') {
        Object.assign(payload, {
          kos_type: kosType, facilities, room_available: Number(roomAvailable),
          room_size_m2: roomSizeM2 ? Number(roomSizeM2) : null,
          electricity_type: electricityType || null,
          kos_rules: kosRules || null,
        });
      } else if (type === 'properti') {
        Object.assign(payload, {
          property_type: propertyType,
          land_area_m2: landArea ? Number(landArea) : null,
          building_area_m2: buildingArea ? Number(buildingArea) : null,
          certificate_type: certificateType || null,
          facilities: propFacilities,
        });
        if (!isLand) {
          Object.assign(payload, {
            bedroom_count: bedroomCount ? Number(bedroomCount) : null,
            bathroom_count: bathroomCount ? Number(bathroomCount) : null,
            property_condition: propertyCondition || null,
            is_furnished: isFurnished,
            pets_allowed: petsAllowed,
            min_rental_period: minRentalPeriod || null,
          });
        } else {
          Object.assign(payload, {
            land_contour: landContour || null,
            land_access: landAccess,
            land_purpose: landPurpose || null,
          });
        }
      } else if (type === 'kendaraan') {
        Object.assign(payload, {
          vehicle_type: vehicleType, vehicle_brand: vehicleBrand,
          vehicle_year: vehicleYear ? Number(vehicleYear) : null,
          vehicle_condition: vehicleCondition,
          vehicle_color: vehicleColor || null,
          engine_cc: engineCc ? Number(engineCc) : null,
          plate_number: transactionType === 'jual' ? (plateNumber || null) : null,
          includes_driver: includesDriver,
          min_rent_days: transactionType === 'sewa' ? Number(minRentDays) : null,
        });
      } else if (type === 'jasa') {
        Object.assign(payload, { service_category: serviceCategory, service_area: serviceArea });
      }

      const res = await fetch(`${API}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { setSubmitted(true); } else { setError(data.error?.message ?? 'Gagal menambah listing.'); }
    } catch { setError('Koneksi bermasalah. Coba lagi.'); }
    finally { setLoading(false); }
  };

  const canNext = [
    !!type,
    title.trim().length >= 5 && !!city && phone.length >= 9,
    type === 'kos' ? (!!kosType && !!price) :
    type === 'properti' ? (!!propertyType && (isLand ? true : !!transactionType) && !!price) :
    type === 'kendaraan' ? (!!vehicleType && !!vehicleBrand && !!transactionType && !!price) :
    type === 'jasa' ? !!serviceCategory : false,
  ][step];

  const currentType = LISTING_TYPES.find(t => t.key === type);
  const headerTitle = type === 'kos' ? 'Daftarkan Kos-kosan' : type === 'properti' ? 'Daftarkan Properti' : type === 'kendaraan' ? 'Daftarkan Kendaraan' : type === 'jasa' ? 'Daftarkan Jasa Kamu' : 'Tambah Listing Baru';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">{type ? `${currentType?.icon} ${headerTitle}` : headerTitle}</h1>
        <p className="text-sm text-gray-500">{type ? currentType?.desc : 'Pilih tipe listing yang ingin kamu daftarkan'}</p>
      </div>

      {/* Step indicator */}
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

      {/* ─── Step 0: Tipe ─── */}
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

      {/* ─── Step 1: Info Dasar ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <Input label="Judul Listing" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={type === 'kos' ? 'Kos Putri Akehuda dekat UNKHAIR' : type === 'properti' ? 'Rumah 3 Kamar di BTN Ternate' : type === 'kendaraan' ? 'Honda Beat 2022 Mulus' : 'Tukang Listrik Berpengalaman Ternate'} />

          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ceritakan lebih detail..." rows={4}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
          </div>

          <div>
            <ImageUpload
              bucket="listings"
              label="Foto Cover"
              onUpload={(urls: string[]) => setCoverUrl(urls[0] ?? '')}
              existingUrl={coverUrl}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Kota</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CITIES.map(c => <Btn key={c} active={city === c} onClick={() => setCity(c)}>{c}</Btn>)}
            </div>
          </div>

          <Input label="Alamat Lengkap" value={address} onChange={e => setAddress(e.target.value)} placeholder="Nama jalan, kelurahan, kecamatan" optional />

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

      {/* ─── Step 2: Detail ─── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* ── KOS ── */}
          {type === 'kos' && (<>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipe Kos</label>
              <div className="mt-1.5 flex gap-2">
                {['putra', 'putri', 'campur'].map(k => <Btn key={k} active={kosType === k} onClick={() => setKosType(k)}>{k === 'putra' ? '👨 Putra' : k === 'putri' ? '👩 Putri' : '👫 Campur'}</Btn>)}
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
            <Toggle label="Harga bisa nego" desc="Tampilkan tanda nego di listing kamu" checked={isNegotiable} onChange={setIsNegotiable} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kamar Tersedia" type="number" value={roomAvailable} onChange={e => setRoomAvailable(e.target.value)} min="1" />
              <Input label="Ukuran Kamar (m²)" type="number" value={roomSizeM2} onChange={e => setRoomSizeM2(e.target.value)} placeholder="12" optional />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Listrik</label>
              <div className="mt-1.5 flex gap-2">
                {['Token', 'Included'].map(e => <Btn key={e} active={electricityType === e} onClick={() => setElectricityType(e)}>{e === 'Token' ? '⚡ Token' : '✅ Sudah included'}</Btn>)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fasilitas</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {KOS_FACILITIES.map(f => <Btn key={f} active={facilities.includes(f)} onClick={() => toggleFacility(f, facilities, setFacilities)}>{f}</Btn>)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Peraturan Kos <span className="text-gray-400">(opsional)</span></label>
              <textarea value={kosRules} onChange={e => setKosRules(e.target.value)} placeholder="Contoh: Tidak boleh bawa tamu menginap, jam malam pk 22.00..." rows={3}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]" />
            </div>
          </>)}

          {/* ── PROPERTI ── */}
          {type === 'properti' && (<>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipe Properti</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {['Rumah', 'Ruko', 'Apartemen', 'Gudang', 'Kos', 'Tanah'].map(p => <Btn key={p} active={propertyType === p} onClick={() => setPropertyType(p)}>{p}</Btn>)}
              </div>
            </div>

            {!isLand && (
              <div>
                <label className="text-sm font-medium text-gray-700">Jenis Transaksi</label>
                <div className="mt-1.5 flex gap-2">
                  {['jual', 'sewa'].map(t => <Btn key={t} active={transactionType === t} onClick={() => setTransactionType(t)}>{t === 'jual' ? '💰 Dijual' : '🔑 Disewa'}</Btn>)}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Status Sertifikat</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {['SHM', 'HGB', 'HGU', 'AJB', 'Girik', 'SHGB'].map(c => <Btn key={c} active={certificateType === c} onClick={() => setCertificateType(c)}>{c}</Btn>)}
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
            <Toggle label="Harga bisa nego" checked={isNegotiable} onChange={setIsNegotiable} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Luas Tanah (m²)" type="number" value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="100" optional />
              {!isLand && <Input label="Luas Bangunan (m²)" type="number" value={buildingArea} onChange={e => setBuildingArea(e.target.value)} placeholder="80" optional />}
            </div>

            {!isLand && (<>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Kamar Tidur" type="number" value={bedroomCount} onChange={e => setBedroomCount(e.target.value)} placeholder="3" optional />
                <Input label="Kamar Mandi" type="number" value={bathroomCount} onChange={e => setBathroomCount(e.target.value)} placeholder="2" optional />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Kondisi Bangunan</label>
                <div className="mt-1.5 flex gap-2">
                  {['baru', 'bekas', 'renovasi'].map(c => <Btn key={c} active={propertyCondition === c} onClick={() => setPropertyCondition(c)}>{c === 'baru' ? '✨ Baru' : c === 'bekas' ? '🏠 Bekas' : '🔨 Renovasi'}</Btn>)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fasilitas</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {PROPERTY_FACILITIES.map(f => <Btn key={f} active={propFacilities.includes(f)} onClick={() => toggleFacility(f, propFacilities, setPropFacilities)}>{f}</Btn>)}
                </div>
              </div>
              <Toggle label="Furnished" desc="Sudah termasuk perabotan" checked={isFurnished} onChange={setIsFurnished} />
              {transactionType === 'sewa' && (<>
                <Toggle label="Boleh hewan peliharaan" checked={petsAllowed} onChange={setPetsAllowed} />
                <div>
                  <label className="text-sm font-medium text-gray-700">Minimal Masa Sewa</label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {['1 bulan', '3 bulan', '6 bulan', '1 tahun', '2 tahun'].map(p => <Btn key={p} active={minRentalPeriod === p} onClick={() => setMinRentalPeriod(p)}>{p}</Btn>)}
                  </div>
                </div>
              </>)}
            </>)}

            {isLand && (<>
              <div>
                <label className="text-sm font-medium text-gray-700">Kontur Tanah</label>
                <div className="mt-1.5 flex gap-2">
                  {['datar', 'miring'].map(c => <Btn key={c} active={landContour === c} onClick={() => setLandContour(c)}>{c === 'datar' ? '➖ Datar' : '📐 Miring'}</Btn>)}
                </div>
              </div>
              <Toggle label="Akses jalan tersedia" desc="Ada akses jalan langsung ke lokasi" checked={landAccess} onChange={setLandAccess} />
              <div>
                <label className="text-sm font-medium text-gray-700">Peruntukan Tanah</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {['Perumahan', 'Komersial', 'Pertanian', 'Industri', 'Campuran'].map(p => <Btn key={p} active={landPurpose === p} onClick={() => setLandPurpose(p)}>{p}</Btn>)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Jenis Transaksi</label>
                <div className="mt-1.5 flex gap-2">
                  {['jual', 'sewa'].map(t => <Btn key={t} active={transactionType === t} onClick={() => setTransactionType(t)}>{t === 'jual' ? '💰 Dijual' : '🔑 Disewa'}</Btn>)}
                </div>
              </div>
            </>)}
          </>)}

          {/* ── KENDARAAN ── */}
          {type === 'kendaraan' && (<>
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Kendaraan</label>
              <div className="mt-1.5 flex gap-2">
                {[['motor','🏍️'],['mobil','🚗'],['pickup','🛻'],['truk','🚛']].map(([v,e]) => <Btn key={v} active={vehicleType === v} onClick={() => setVehicleType(v)}>{e} {v}</Btn>)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Transaksi</label>
              <div className="mt-1.5 flex gap-2">
                {['jual','sewa'].map(t => <Btn key={t} active={transactionType === t} onClick={() => setTransactionType(t)}>{t === 'jual' ? '💰 Dijual' : '🔑 Disewa'}</Btn>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Merk / Model" value={vehicleBrand} onChange={e => setVehicleBrand(e.target.value)} placeholder="Honda Beat" />
              <Input label="Tahun" type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2022" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Warna" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="Merah" optional />
              <Input label="Kapasitas Mesin (CC)" type="number" value={engineCc} onChange={e => setEngineCc(e.target.value)} placeholder="125" optional />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kondisi</label>
              <div className="mt-1.5 flex gap-2">
                {['baru','bekas'].map(c => <Btn key={c} active={vehicleCondition === c} onClick={() => setVehicleCondition(c)}>{c === 'baru' ? '✨ Baru' : '🔧 Bekas'}</Btn>)}
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
            <Toggle label="Harga bisa nego" checked={isNegotiable} onChange={setIsNegotiable} />
            {transactionType === 'jual' && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <Input label="Plat Nomor" value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} placeholder="BG 1234 AB" optional />
                <p className="mt-1 text-xs text-blue-600">Plat nomor hanya terlihat oleh user yang sudah login — untuk verifikasi pajak & BPKB</p>
              </div>
            )}
            {transactionType === 'sewa' && (<>
              <Toggle label="Termasuk driver" checked={includesDriver} onChange={setIncludesDriver} />
              <Input label="Minimal Sewa (hari)" type="number" value={minRentDays} onChange={e => setMinRentDays(e.target.value)} placeholder="1" optional />
            </>)}
          </>)}

          {/* ── JASA ── */}
          {type === 'jasa' && (<>
            <div>
              <label className="text-sm font-medium text-gray-700">Kategori Jasa</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {SERVICE_CATEGORIES.map(s => <Btn key={s} active={serviceCategory === s} onClick={() => setServiceCategory(s)}>{s}</Btn>)}
              </div>
            </div>
            <Input label="Area Layanan" value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder="Ternate Selatan, Ternate Tengah" optional />
            <div>
              <label className="text-sm font-medium text-gray-700">Tarif <span className="text-gray-400">(opsional)</span></label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                <input type="text" value={price} onChange={e => setPrice(fmt(e.target.value))} placeholder="200.000"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]" />
              </div>
              <p className="mt-1 text-xs text-gray-400">Kosongkan jika tarif negosiasi</p>
            </div>
            <Toggle label="Harga bisa nego" checked={isNegotiable} onChange={setIsNegotiable} />
          </>)}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">← Kembali</button>
        )}
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40">Lanjut →</button>
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

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-gray-400">Memuat...</p></div>}>
      <NewListingContent />
    </Suspense>
  );
}
