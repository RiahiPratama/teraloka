'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Kelola / Edit Kos
// PATH: src/app/owner/bakos/[id]/page.tsx
// PENANDA: L5-FE-OWNER-EDIT
// ────────────────────────────────────────────────────────────────
// Prefill: GET /bakos/owner/listings/:id (full + rooms, owner-scoped).
// Simpan: PUT /bakos/owner/listings/:id (field aman; backend tolak
//   status/listing_fee/subscription/source/owner_id).
// Lokasi: GeographicScopePicker prefill ke location_id existing.
//   city_id di-derive ulang backend kalau location_id berubah.
// 🛡️ Fix tombol "Kelola" dashboard yang sebelumnya 404.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import ImageUpload from '@/components/ui/ImageUpload';
import { GeographicScopePicker, type LocationScope, type LocationBreadcrumb } from '@/components/shared/locations';
import { BAKOS_TOKENS, formatRp } from '@/components/bakos/owner/types';
import { ChevronLeft, BedDouble, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const SHARED_FACILITIES = ['Dapur bersama', 'Ruang tamu', 'Ruang santai', 'Jemuran', 'Tempat cuci', 'Mushola', 'Taman', 'Area parkir motor', 'Area parkir mobil', 'CCTV area umum', 'Satpam 24 jam', 'Akses kartu', 'Lift'];
const LANDMARKS = ['Dekat kampus', 'Dekat sekolah', 'Dekat rumah sakit', 'Dekat pasar', 'Dekat mall', 'Dekat pelabuhan', 'Dekat kantor pemerintah', 'Dekat masjid', 'Dekat pusat kota', 'Pinggir jalan utama'];

export default function OwnerKosEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [roomCount, setRoomCount] = useState(0);

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [scope, setScope] = useState<LocationScope | null>(null);
  const [scopeLabel, setScopeLabel] = useState('');
  const [address, setAddress] = useState('');
  const [kosType, setKosType] = useState('');
  const [electricityType, setElectricityType] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [kosRules, setKosRules] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [landmarks, setLandmarks] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const k = await api.get<any>(`/bakos/owner/listings/${id}`);
      setTitle(k.title ?? '');
      setDescription(k.description ?? '');
      setPhone(String(k.phone ?? ''));
      setPhotos(Array.isArray(k.photos) ? k.photos : []);
      setAddress(k.address ?? '');
      setKosType(k.kos_type ?? '');
      setElectricityType(k.electricity_type ?? '');
      setFacilities(Array.isArray(k.facilities) ? k.facilities : []);
      setKosRules(k.kos_rules ?? '');
      setIsNegotiable(!!k.is_negotiable);
      setLandmarks(Array.isArray(k.nearby_landmarks) ? k.nearby_landmarks : []);
      setRoomCount(Array.isArray(k.rooms) ? k.rooms.length : 0);
      if (k.location_id) setScope({ id: k.location_id, type: 'desa' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat kos.');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      await api.put(`/bakos/owner/listings/${id}`, {
        title, description,
        phone: phone.replace(/\D/g, ''),
        photos,
        cover_image_url: photos[0] ?? null,
        location_id: scope?.id ?? null,
        address,
        kos_type: kosType,
        electricity_type: electricityType || null,
        facilities,
        kos_rules: kosRules || null,
        is_negotiable: isNegotiable,
        nearby_landmarks: landmarks,
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Hapus kos ini? Listing akan dinonaktifkan dari pencarian.')) return;
    try {
      await api.delete(`/bakos/owner/listings/${id}`);
      router.push('/owner/bakos');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menghapus.');
    }
  }

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}>
      <button onClick={() => router.push('/login?redirect=/owner/bakos')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk dulu</button>
    </div>;
  }

  const inputCls = 'mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#854F0B]';
  const chip = (active: boolean) => active ? { background: BRAND, color: '#fff' } : { background: '#F1EFE8', color: '#5F5E5A' };

  return (
    <div className="min-h-screen pb-20" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        <button onClick={() => router.push('/owner/bakos')} className="flex items-center gap-1 text-xs mb-3" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kos Saya
        </button>

        <h1 className="text-lg font-bold mb-1" style={{ color: BAKOS_TOKENS.textPrimary }}>Kelola Kos</h1>
        <p className="text-xs mb-4" style={{ color: BAKOS_TOKENS.textSecondary }}>Ubah info kos. Status & langganan diatur admin.</p>

        {/* Kelola kamar */}
        <button onClick={() => router.push(`/owner/bakos/${id}/kamar`)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 mb-4" style={{ background: BAKOS_TOKENS.accentBg, border: `0.5px solid ${BAKOS_TOKENS.border}` }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND }}>
            <BedDouble size={17} /> Kelola Kamar
          </span>
          <span className="text-xs" style={{ color: BAKOS_TOKENS.textSecondary }}>{roomCount} tipe →</span>
        </button>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nama Kos</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>

          <ImageUpload bucket="listings" label="Foto Kos" onUpload={(urls: string[]) => setPhotos(urls)} existingUrls={photos} maxFiles={5} />

          <div>
            <label className="text-sm font-medium text-gray-700">Lokasi Kos (Kelurahan/Desa)</label>
            <p className="text-xs text-gray-400 mb-1.5">Penyala peta sebaran & pencarian area</p>
            <GeographicScopePicker
              value={scope}
              onChange={(s, bc?: LocationBreadcrumb) => { setScope(s); setScopeLabel(bc?.display_short ?? ''); }}
              allowedTypes={['kelurahan', 'desa']}
              allowGps
              brandColor={BRAND}
              placeholder="Cari kelurahan / desa..."
            />
            {scopeLabel && <p className="mt-1 text-xs" style={{ color: BRAND }}>📍 {scopeLabel}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Alamat Lengkap <span className="text-gray-400">(disembunyikan publik sampai berlangganan)</span></label>
            <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nomor WA</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#854F0B] mt-1.5">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">+62</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="flex-1 h-12 px-3 text-sm outline-none bg-transparent" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Tipe Kos</label>
            <div className="mt-1.5 flex gap-2">{['putra', 'putri', 'campur'].map(k => (
              <button key={k} onClick={() => setKosType(k)} className="rounded-xl py-2 px-3 text-xs font-medium capitalize" style={chip(kosType === k)}>{k}</button>
            ))}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Listrik</label>
            <div className="mt-1.5 flex gap-2">{['Token', 'Included'].map(e => (
              <button key={e} onClick={() => setElectricityType(e)} className="rounded-xl py-2 px-3 text-xs font-medium" style={chip(electricityType === e)}>{e}</button>
            ))}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fasilitas Bersama</label>
            <div className="flex flex-wrap gap-2 mt-1.5">{SHARED_FACILITIES.map(f => (
              <button key={f} onClick={() => toggle(facilities, setFacilities, f)} className="rounded-xl py-2 px-3 text-xs font-medium" style={chip(facilities.includes(f))}>{f}</button>
            ))}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Dekat dengan</label>
            <div className="flex flex-wrap gap-2 mt-1.5">{LANDMARKS.map(l => (
              <button key={l} onClick={() => toggle(landmarks, setLandmarks, l)} className="rounded-xl py-2 px-3 text-xs font-medium" style={chip(landmarks.includes(l))}>{l}</button>
            ))}</div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: BRAND }} />
            <div><p className="text-sm font-medium text-gray-800">Harga bisa nego</p></div>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700">Peraturan Kos</label>
            <textarea value={kosRules} onChange={e => setKosRules(e.target.value)} rows={4} placeholder="Jam malam, tamu menginap, dll." className={inputCls} />
          </div>

          {error && <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#FDECEC' }}><AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" /><p className="text-xs text-red-800">{error}</p></div>}
          {savedAt && !error && <p className="text-xs font-semibold" style={{ color: '#15803D' }}>✓ Tersimpan</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BRAND }}>
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={handleDelete} className="rounded-xl px-4 py-3 text-sm font-medium border border-red-200 text-red-600 flex items-center gap-1">
              <Trash2 size={15} /> Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
