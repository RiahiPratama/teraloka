'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Kelola / Edit Kos (PREMIUM)
// PATH: src/app/owner/bakos/[id]/page.tsx
// PENANDA: L5-FE-OWNER-EDIT
// ────────────────────────────────────────────────────────────────
// Prefill: GET /bakos/owner/listings/:id (full + rooms, owner-scoped).
// Simpan:  PUT /bakos/owner/listings/:id (field aman saja).
// Premium pass: kartu ber-shadow + section bertingkat + input refined
//   + save bar sticky. Bahasa visual kertas+amber (BAKOS_TOKENS).
// 🛡️ 'Akses kartu' & 'Lift' dibuang (tidak relevan kos MalUt).
// 🛡️ Pasutri/anak = ATURAN → chip cepat menambah baris ke kos_rules
//    (tanpa kolom baru; promote ke kolom hanya bila jadi filter).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import ImageUpload from '@/components/ui/ImageUpload';
import { GeographicScopePicker, type LocationScope, type LocationBreadcrumb } from '@/components/shared/locations';
import { BAKOS_TOKENS } from '@/components/bakos/owner/types';
import KosMapPicker from '@/components/bakos/owner/KosMapPicker';
import type { LatLng } from '@/components/bakos/owner/KosMapPickerInner';
import { ChevronLeft, BedDouble, Trash2, Loader2, AlertCircle, Save, Check } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;

const SHARED_FACILITIES = ['Dapur bersama', 'Ruang tamu', 'Ruang santai', 'Jemuran', 'Tempat cuci', 'Mushola', 'Taman', 'Area parkir motor', 'Area parkir mobil', 'CCTV area umum', 'Satpam 24 jam'];
const LANDMARKS = ['Dekat kampus', 'Dekat sekolah', 'Dekat rumah sakit', 'Dekat pasar', 'Dekat mall', 'Dekat pelabuhan', 'Dekat kantor pemerintah', 'Dekat masjid', 'Dekat pusat kota', 'Pinggir jalan utama'];
const RULE_CHIPS = ['Maks 2 orang/kamar', 'Jam malam 22.00', 'Wajib lapor tamu menginap', 'Wajib jaga kebersihan'];

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [scope, setScope] = useState<LocationScope | null>(null);
  const [scopeLabel, setScopeLabel] = useState('');
  const [coord, setCoord] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [kosType, setKosType] = useState('');
  const [electricityType, setElectricityType] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [kosRules, setKosRules] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [coupleAllowed, setCoupleAllowed] = useState<boolean | null>(null);
  const [childrenAllowed, setChildrenAllowed] = useState<boolean | null>(null);
  const [petsAllowed, setPetsAllowed] = useState<boolean | null>(null);

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
      setCoupleAllowed(k.couple_allowed ?? null);
      setChildrenAllowed(k.children_allowed ?? null);
      setPetsAllowed(k.pets_allowed ?? null);
      if (k.location_id) setScope({ id: k.location_id, type: 'desa' });
      if (k.latitude != null && k.longitude != null) setCoord({ lat: Number(k.latitude), lng: Number(k.longitude) });
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
        latitude: coord?.lat ?? null,
        longitude: coord?.lng ?? null,
        address,
        kos_type: kosType,
        electricity_type: electricityType || null,
        facilities,
        kos_rules: kosRules || null,
        is_negotiable: isNegotiable,
        nearby_landmarks: landmarks,
        couple_allowed: coupleAllowed,
        children_allowed: childrenAllowed,
        pets_allowed: petsAllowed,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
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

  function addRule(text: string) {
    setKosRules(prev => {
      const lines = prev ? prev.split('\n').map(s => s.trim()).filter(Boolean) : [];
      if (lines.includes(text)) return prev;
      return [...lines, text].join('\n');
    });
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}>
      <button onClick={() => router.push('/login?redirect=/owner/bakos')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk dulu</button>
    </div>;
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push('/owner/bakos')} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kos Saya
        </button>

        <div className="mb-5">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Kelola Kos</h1>
          <p className="text-[13px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>Ubah info kos. Status & langganan diatur admin.</p>
        </div>

        {/* Kelola kamar — CTA premium */}
        <button onClick={() => router.push(`/owner/bakos/${id}/kamar`)}
          className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 mb-5 transition-transform active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${BAKOS_TOKENS.accentBg}, #fff)`, border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 1px 3px rgba(133,79,11,0.06)' }}>
          <span className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
              <BedDouble size={17} style={{ color: BRAND }} />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Kelola Kamar</span>
              <span className="block text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>Tipe, harga, ketersediaan</span>
            </span>
          </span>
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>{roomCount} tipe →</span>
        </button>

        <div className="space-y-4">
          <Section title="Info Dasar">
            <Field label="Nama Kos">
              <input value={title} onChange={e => setTitle(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Deskripsi">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={INPUT} />
            </Field>
            <Field label="Foto Kos">
              <ImageUpload bucket="listings" label="" onUpload={(urls: string[]) => setPhotos(urls)} existingUrls={photos} maxFiles={5} />
            </Field>
            <Field label="Nomor WA">
              <div className="flex items-center overflow-hidden rounded-xl border bg-white focus-within:border-[#854F0B] focus-within:ring-2 focus-within:ring-[#854F0B]/15 transition" style={{ borderColor: BAKOS_TOKENS.border }}>
                <span className="flex h-11 items-center border-r px-3 text-sm" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>+62</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="flex-1 h-11 px-3 text-sm outline-none bg-transparent" />
              </div>
            </Field>
          </Section>

          <Section title="Lokasi">
            <Field label="Kelurahan / Desa" hint="Penyala peta sebaran & pencarian area">
              <GeographicScopePicker
                value={scope}
                onChange={(s, bc?: LocationBreadcrumb) => { setScope(s); setScopeLabel(bc?.display_short ?? ''); }}
                allowedTypes={['kelurahan', 'desa']}
                allowGps
                brandColor={BRAND}
                placeholder="Cari kelurahan / desa..."
              />
              {scopeLabel && <p className="mt-1.5 text-xs font-medium" style={{ color: BRAND }}>📍 {scopeLabel}</p>}
            </Field>
            <Field label="Alamat Lengkap" hint="Disembunyikan dari publik sampai berlangganan">
              <input value={address} onChange={e => setAddress(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Titik Peta (opsional)" hint="Tandai lokasi presisi kos. Hanya tampil ke publik setelah berlangganan.">
              <KosMapPicker value={coord} onChange={setCoord} />
            </Field>
          </Section>

          <Section title="Tipe & Fasilitas">
            <Field label="Tipe Kos">
              <ChipRow options={['putra', 'putri', 'campur']} active={[kosType]} onTap={setKosType} capitalize />
            </Field>
            <Field label="Listrik">
              <ChipRow options={['Token', 'Included']} active={[electricityType]} onTap={setElectricityType} />
            </Field>
            <Field label="Fasilitas Bersama">
              <ChipRow options={SHARED_FACILITIES} active={facilities} onTap={(v) => toggle(facilities, setFacilities, v)} multi />
            </Field>
            <Field label="Dekat Dengan">
              <ChipRow options={LANDMARKS} active={landmarks} onTap={(v) => toggle(landmarks, setLandmarks, v)} multi />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-3" style={{ borderColor: BAKOS_TOKENS.border }}>
              <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="h-4 w-4" style={{ accentColor: BRAND }} />
              <span className="text-sm font-medium" style={{ color: BAKOS_TOKENS.textPrimary }}>Harga bisa nego</span>
            </label>
          </Section>

          <Section title="Peraturan">
            <Field label="Boleh Pasutri / Anak / Hewan?" hint="Dipakai untuk filter pencarian. Tidak dipilih = belum dinyatakan.">
              <div className="space-y-2">
                <TriRule label="Pasutri (suami-istri)" value={coupleAllowed} onChange={setCoupleAllowed} />
                <TriRule label="Bawa anak" value={childrenAllowed} onChange={setChildrenAllowed} />
                <TriRule label="Bawa hewan" value={petsAllowed} onChange={setPetsAllowed} />
              </div>
            </Field>
            <Field label="Aturan Cepat" hint="Tap untuk menambah ke peraturan kos">
              <div className="flex flex-wrap gap-2">
                {RULE_CHIPS.map(r => (
                  <button key={r} type="button" onClick={() => addRule(r)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95"
                    style={{ background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>
                    + {r}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Peraturan Kos">
              <textarea value={kosRules} onChange={e => setKosRules(e.target.value)} rows={5} placeholder="Satu aturan per baris. Tap chip di atas atau tulis sendiri." className={INPUT} />
            </Field>
          </Section>

          {error && <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#FDECEC' }}><AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" /><p className="text-xs text-red-800">{error}</p></div>}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur" style={{ background: 'rgba(239,237,229,0.92)', borderColor: BAKOS_TOKENS.border }}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2">
          {savedAt && <span className="flex items-center gap-1 text-xs font-semibold mr-auto" style={{ color: '#15803D' }}><Check size={14} /> Tersimpan</span>}
          {!savedAt && <span className="text-[11px] mr-auto" style={{ color: BAKOS_TOKENS.textTertiary }}>Perubahan belum tersimpan</span>}
          <button onClick={handleDelete} className="rounded-xl px-3.5 py-2.5 text-sm font-medium border border-red-200 text-red-600 flex items-center gap-1.5"><Trash2 size={15} /> Hapus</button>
          <button onClick={handleSave} disabled={saving} className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2" style={{ background: BRAND }}>
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Premium primitives ──────────────────────────────────────────
const INPUT = 'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition border-[#E4E0D5] focus:border-[#854F0B] focus:ring-2 focus:ring-[#854F0B]/15 placeholder:text-gray-400';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5 space-y-4" style={{ border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BAKOS_TOKENS.textTertiary }}>{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[13px] font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: BAKOS_TOKENS.textTertiary }}>{hint}</p>}
      <div className={hint ? '' : 'mt-1.5'}>{children}</div>
    </div>
  );
}

function TriRule({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const set = (v: boolean) => onChange(value === v ? null : v);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5" style={{ borderColor: BAKOS_TOKENS.border }}>
      <span className="text-sm" style={{ color: BAKOS_TOKENS.textPrimary }}>{label}</span>
      <div className="flex gap-1.5 shrink-0">
        <button type="button" onClick={() => set(true)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95"
          style={value === true ? { background: '#15803D', color: '#fff', borderColor: '#15803D' } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Boleh</button>
        <button type="button" onClick={() => set(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95"
          style={value === false ? { background: '#B91C1C', color: '#fff', borderColor: '#B91C1C' } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Tidak</button>
      </div>
    </div>
  );
}

function ChipRow({ options, active, onTap, multi, capitalize }: { options: string[]; active: string[]; onTap: (v: string) => void; multi?: boolean; capitalize?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = active.includes(o);
        return (
          <button key={o} type="button" onClick={() => onTap(o)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95 ${capitalize ? 'capitalize' : ''}`}
            style={on ? { background: BRAND, color: '#fff', borderColor: BRAND } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
