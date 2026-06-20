'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Tambah Kos (form 3-step, PREMIUM)
// PATH: src/app/owner/bakos/baru/page.tsx
// PENANDA: L5-FE-OWNER-BARU
// ────────────────────────────────────────────────────────────────
// createKos via /bakos/owner/listings (owner-scoped). location_id dari
// GeographicScopePicker; city_id derive backend. Aturan pasutri/anak/hewan
// tristate (kolom terstruktur). Kamar SEQUENTIAL (cap kumulatif).
// Visual: konsisten edit page (Section/Field/INPUT/ChipRow/TriRule + amber).
// ════════════════════════════════════════════════════════════════

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { useSosLift } from '@/components/providers/SosLiftProvider';
import { labelsToFacObject, LISTING_FAC_LABEL, ROOM_FAC_LABEL } from '@/components/bakos/public/bakos-links';
import ImageUpload from '@/components/ui/ImageUpload';
import { GeographicScopePicker, type LocationScope, type LocationBreadcrumb } from '@/components/shared/locations';
import { BAKOS_TOKENS } from '@/components/bakos/owner/types';
import KosMapPicker from '@/components/bakos/owner/KosMapPicker';
import type { LatLng } from '@/components/bakos/owner/KosMapPickerInner';
import { ChevronLeft, ChevronDown, Plus, Check, Loader2 } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const SHARED_FACILITIES = ['Dapur bersama', 'Ruang tamu', 'Ruang santai', 'Jemuran', 'Tempat cuci', 'Mushola', 'Taman', 'Area parkir motor', 'Area parkir mobil', 'CCTV area umum', 'Satpam 24 jam', 'Air PDAM'];
const ROOM_FACILITIES = ['WiFi', 'AC', 'Kamar mandi dalam', 'Kamar mandi luar', 'Kloset duduk', 'Kloset jongkok', 'Shower', 'Water heater', 'Dapur pribadi', 'Kasur', 'Lemari', 'Meja belajar', 'Televisi', 'Jendela', 'Balkon', 'Kipas angin', 'Kulkas'];
const LANDMARKS = ['Dekat kampus', 'Dekat sekolah', 'Dekat rumah sakit', 'Dekat pasar', 'Dekat mall', 'Dekat pelabuhan', 'Dekat kantor pemerintah', 'Dekat masjid', 'Dekat pusat kota', 'Pinggir jalan utama'];
const RULE_CHIPS = ['Maks 2 orang/kamar', 'Jam malam 22.00', 'Wajib lapor tamu menginap', 'Wajib jaga kebersihan'];
const STEPS = ['Info Dasar', 'Fasilitas & Aturan', 'Tipe Kamar'];

interface RoomType {
  id: string; room_type: string; description: string; price: string; price_period: string;
  total_rooms: string; available_rooms: string; size_m2: string; facilities: string[]; photos: string[];
}
function emptyRoom(): RoomType {
  return { id: Date.now().toString() + Math.random(), room_type: '', description: '', price: '', price_period: 'bulan', total_rooms: '1', available_rooms: '1', size_m2: '', facilities: [], photos: [] };
}

function KosFormContent() {
  const router = useRouter();
  const { user } = useAuth();
  const api = useApi();
  useSosLift(); // 🛡️ SOS naik di atas save bar wizard; cleanup saat unmount

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
  const [coord, setCoord] = useState<LatLng | null>(null);

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
  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const updateRoom = (id: string, field: keyof RoomType, value: any) => setRooms(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));
  const toggleRoomFacility = (id: string, f: string) => setRooms(p => p.map(r => r.id !== id ? r : { ...r, facilities: r.facilities.includes(f) ? r.facilities.filter(x => x !== f) : [...r.facilities, f] }));
  function addRoom() { const n = emptyRoom(); setRooms(p => [...p, n]); setExpandedRoom(n.id); }
  function removeRoom(id: string) { if (rooms.length === 1) return; setRooms(p => p.filter(r => r.id !== id)); }
  function addRule(text: string) {
    setKosRules(prev => {
      const lines = prev ? prev.split('\n').map(s => s.trim()).filter(Boolean) : [];
      if (lines.includes(text)) return prev;
      return [...lines, text].join('\n');
    });
  }

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
        latitude: coord?.lat ?? null,
        longitude: coord?.lng ?? null,
        address,
        phone: phone.replace(/\D/g, ''),
        cover_image_url: coverPhotos[0] ?? null,
        photos: coverPhotos,
        kos_type: kosType,
        electricity_type: electricityType || null,
        facilities: labelsToFacObject(sharedFacilities, LISTING_FAC_LABEL),
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
          room_type: r.room_type, description: r.description || null,
          price: Number(r.price.replace(/\D/g, '')), price_period: r.price_period,
          total_rooms: Number(r.total_rooms), available_rooms: Number(r.available_rooms),
          size_m2: r.size_m2 ? Number(r.size_m2) : null,
          facilities: labelsToFacObject(r.facilities, ROOM_FAC_LABEL), photos: r.photos,
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BAKOS_TOKENS.pageBg }}>
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Masuk dulu</h2>
          <button onClick={() => router.push('/login?redirect=/owner/bakos/baru')} className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BAKOS_TOKENS.pageBg }}>
        <div className="text-center max-w-sm rounded-2xl bg-white p-7" style={{ border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 4px 20px rgba(133,79,11,0.08)' }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: BAKOS_TOKENS.accentBg }}>
            <Check size={30} style={{ color: BRAND }} strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>Kos Didaftarkan!</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: BAKOS_TOKENS.textSecondary }}>
            Listing kamu masuk beserta {rooms.length} tipe kamar. Tim TeraLoka verifikasi & menayangkan dalam 1×24 jam. Kontak terbuka setelah kamu berlangganan.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => router.push('/owner/bakos')} className="flex-1 rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Ke Dashboard</button>
            <button onClick={() => { setSubmitted(false); setStep(0); }} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>Daftar Lagi</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-44" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push('/owner/bakos')} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kos Saya
        </button>

        <div className="mb-5">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Daftarkan Kos</h1>
          <p className="text-[13px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>Isi info lengkap agar mudah ditemukan calon penghuni</p>
        </div>

        {/* Step indicator premium */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={i < step ? { background: BRAND, color: '#fff' } : i === step ? { border: `2px solid ${BRAND}`, color: BRAND, background: BAKOS_TOKENS.accentBg } : { background: '#EAE7DE', color: '#A8A498' }}>
                {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="h-0.5 w-8 rounded-full" style={{ background: i < step ? BRAND : '#E0DCD1' }} />}
            </div>
          ))}
          <span className="ml-1 text-xs font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{STEPS[step]}</span>
        </div>

        {/* STEP 1 */}
        {step === 0 && (
          <Section title="Info Dasar">
            <Field label="Nama Kos">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Kos Putri Ibu Amber Akehuda" className={INPUT} />
            </Field>
            <Field label="Deskripsi" hint="Opsional — keunggulan kos, suasana, akses transportasi">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={INPUT} />
            </Field>
            <Field label="Foto Kos" hint="Tampak luar, area umum, lingkungan">
              <ImageUpload bucket="listings" label="" onUpload={(urls: string[]) => setCoverPhotos(urls)} existingUrls={coverPhotos} maxFiles={5} />
            </Field>
            <Field label="Lokasi Kos (Kelurahan/Desa)" hint="Penyala peta sebaran & pencarian area">
              <GeographicScopePicker
                value={scope}
                onChange={(s, bc?: LocationBreadcrumb) => { setScope(s); setScopeLabel(bc?.display_short ?? ''); }}
                allowedTypes={['kelurahan', 'desa']}
                allowGps brandColor={BRAND} placeholder="Cari kelurahan / desa..."
              />
              {scopeLabel && <p className="mt-1.5 text-xs font-medium" style={{ color: BRAND }}>📍 {scopeLabel}</p>}
            </Field>
            <Field label="Alamat Lengkap" hint="Opsional — disembunyikan dari publik sampai berlangganan">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Nama jalan & nomor" className={INPUT} />
            </Field>
            <Field label="Titik Peta (opsional)" hint="Tandai lokasi presisi kos. Hanya tampil ke publik setelah berlangganan.">
              <KosMapPicker value={coord} onChange={setCoord} />
            </Field>
            <Field label="Dekat Dengan" hint="Opsional — bantu calon penghuni nemu kos kamu">
              <ChipRow options={LANDMARKS} active={landmarks} onTap={(v) => toggle(landmarks, setLandmarks, v)} />
              <input value={landmarkCustom} onChange={e => setLandmarkCustom(e.target.value)} placeholder="Tambah lain... (mis. dekat RSUD Chasan Boesoerie)" className={`${INPUT} mt-2`} />
            </Field>
            <Field label="Nomor WA">
              <div className="flex items-center overflow-hidden rounded-xl border bg-white focus-within:border-[#854F0B] focus-within:ring-2 focus-within:ring-[#854F0B]/15 transition" style={{ borderColor: BAKOS_TOKENS.border }}>
                <span className="flex h-11 items-center border-r px-3 text-sm" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>+62</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="812 3456 7890" className="flex-1 h-11 px-3 text-sm outline-none bg-transparent" />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: BAKOS_TOKENS.textTertiary }}>Dilindungi WA relay — tidak tampil langsung ke publik</p>
            </Field>
          </Section>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="space-y-4">
            <Section title="Tipe & Fasilitas">
              <Field label="Tipe Kos"><ChipRow options={['putra', 'putri', 'campur']} active={[kosType]} onTap={setKosType} capitalize /></Field>
              <Field label="Listrik"><ChipRow options={['Token', 'Included']} active={[electricityType]} onTap={setElectricityType} /></Field>
              <Field label="Fasilitas Bersama" hint="Area umum untuk semua penghuni"><ChipRow options={SHARED_FACILITIES} active={sharedFacilities} onTap={(v) => toggle(sharedFacilities, setSharedFacilities, v)} /></Field>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-3" style={{ borderColor: BAKOS_TOKENS.border }}>
                <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="h-4 w-4" style={{ accentColor: BRAND }} />
                <span className="text-sm font-medium" style={{ color: BAKOS_TOKENS.textPrimary }}>Harga bisa nego</span>
              </label>
            </Section>

            <Section title="Aturan">
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
                    <button key={r} type="button" onClick={() => addRule(r)} className="rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95" style={{ background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>+ {r}</button>
                  ))}
                </div>
              </Field>
              <Field label="Peraturan Kos">
                <textarea value={kosRules} onChange={e => setKosRules(e.target.value)} rows={4} placeholder="Satu aturan per baris. Tap chip di atas atau tulis sendiri." className={INPUT} />
              </Field>
            </Section>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <Section title="Tipe Kamar">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: BAKOS_TOKENS.textSecondary }}>{rooms.length} tipe kamar</p>
              <button onClick={addRoom} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}><Plus size={14} /> Tambah Tipe</button>
            </div>
            <div className="space-y-2.5">
              {rooms.map((room, idx) => (
                <div key={room.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BAKOS_TOKENS.border, background: '#fff' }}>
                  <button onClick={() => setExpandedRoom(expandedRoom === room.id ? '' : room.id)} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: BRAND }}>{idx + 1}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{room.room_type || `Tipe Kamar ${idx + 1}`}</p>
                        {room.price && <p className="text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>Rp {room.price}/{room.price_period} · {room.total_rooms} kamar</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rooms.length > 1 && <span onClick={e => { e.stopPropagation(); removeRoom(room.id); }} className="text-xs text-red-400 px-2 py-1">Hapus</span>}
                      <ChevronDown size={16} className="text-gray-400 transition-transform" style={{ transform: expandedRoom === room.id ? 'rotate(180deg)' : 'none' }} />
                    </div>
                  </button>
                  {expandedRoom === room.id && (
                    <div className="border-t p-3.5 space-y-3.5" style={{ borderColor: BAKOS_TOKENS.border }}>
                      <Field label="Nama Tipe"><input value={room.room_type} onChange={e => updateRoom(room.id, 'room_type', e.target.value)} placeholder="Standar / AC / VIP" className={INPUT} /></Field>
                      <Field label="Deskripsi"><textarea value={room.description} onChange={e => updateRoom(room.id, 'description', e.target.value)} rows={2} className={INPUT} /></Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Harga (Rp)">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                            <input value={room.price} onChange={e => updateRoom(room.id, 'price', fmt(e.target.value))} placeholder="500.000" className={`${INPUT} pl-9`} />
                          </div>
                        </Field>
                        <Field label="Per"><ChipRow options={['bulan', 'malam', 'hari']} active={[room.price_period]} onTap={(v) => updateRoom(room.id, 'price_period', v)} capitalize /></Field>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Total"><input type="number" min="1" value={room.total_rooms} onChange={e => { updateRoom(room.id, 'total_rooms', e.target.value); updateRoom(room.id, 'available_rooms', e.target.value); }} className={INPUT} /></Field>
                        <Field label="Tersedia"><input type="number" min="0" value={room.available_rooms} onChange={e => updateRoom(room.id, 'available_rooms', e.target.value)} className={INPUT} /></Field>
                        <Field label="m²"><input type="number" min="1" value={room.size_m2} onChange={e => updateRoom(room.id, 'size_m2', e.target.value)} placeholder="12" className={INPUT} /></Field>
                      </div>
                      <Field label="Fasilitas Kamar"><ChipRow options={ROOM_FACILITIES} active={room.facilities} onTap={(f) => toggleRoomFacility(room.id, f)} /></Field>
                      <Field label="Foto Kamar"><ImageUpload bucket="listings" label="" onUpload={(urls: string[]) => updateRoom(room.id, 'photos', urls)} existingUrls={room.photos} maxFiles={5} /></Field>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </Section>
        )}
      </div>

      {/* Sticky nav bar */}
      <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-40 border-t backdrop-blur" style={{ background: 'rgba(239,237,229,0.92)', borderColor: BAKOS_TOKENS.border }}>
        <div className="max-w-xl mx-auto px-4 py-3 flex gap-2">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border py-3 text-sm font-medium" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>← Kembali</button>}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: BRAND }}>Lanjut →</button>
          ) : (
            <button onClick={handleSubmit} disabled={!canNext || loading} className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: BRAND }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Mendaftarkan...</> : `Daftarkan Kos (${rooms.length} tipe)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KosBaruPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>}>
      <KosFormContent />
    </Suspense>
  );
}

// ─── Premium primitives (selaras edit page) ─────────────────────
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
function ChipRow({ options, active, onTap, capitalize }: { options: string[]; active: string[]; onTap: (v: string) => void; capitalize?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = active.includes(o);
        return (
          <button key={o} type="button" onClick={() => onTap(o)} className={`rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95 ${capitalize ? 'capitalize' : ''}`}
            style={on ? { background: BRAND, color: '#fff', borderColor: BRAND } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>{o}</button>
        );
      })}
    </div>
  );
}
function TriRule({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const set = (v: boolean) => onChange(value === v ? null : v);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5" style={{ borderColor: BAKOS_TOKENS.border }}>
      <span className="text-sm" style={{ color: BAKOS_TOKENS.textPrimary }}>{label}</span>
      <div className="flex gap-1.5 shrink-0">
        <button type="button" onClick={() => set(true)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95" style={value === true ? { background: '#15803D', color: '#fff', borderColor: '#15803D' } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Boleh</button>
        <button type="button" onClick={() => set(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition active:scale-95" style={value === false ? { background: '#B91C1C', color: '#fff', borderColor: '#B91C1C' } : { background: '#fff', borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Tidak</button>
      </div>
    </div>
  );
}
