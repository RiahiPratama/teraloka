'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Kelola Kamar (PREMIUM)
// PATH: src/app/owner/bakos/[id]/kamar/page.tsx
// PENANDA: L5-FE-OWNER-KAMAR
// ────────────────────────────────────────────────────────────────
// List/CRUD kamar owner-scoped. Cap kamar di-enforce backend (403).
// Visual selaras flow (Section/Field/INPUT/ChipRow + amber).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import ImageUpload from '@/components/ui/ImageUpload';
import { BAKOS_TOKENS, formatRp } from '@/components/bakos/owner/types';
import { ChevronLeft, Plus, Loader2, AlertCircle, Pencil, Trash2, X } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const ROOM_FACILITIES = ['WiFi', 'AC', 'Kamar mandi dalam', 'Kamar mandi luar', 'Kloset duduk', 'Kloset jongkok', 'Shower', 'Water heater', 'Dapur pribadi', 'Kasur', 'Lemari', 'Meja belajar', 'Televisi', 'Jendela', 'Balkon', 'Kipas angin', 'Kulkas'];

interface Room {
  id: string; room_type: string; description: string | null; price: number;
  price_period: string; total_rooms: number; available_rooms: number;
  size_m2: number | null; facilities: string[]; photos: string[];
}
interface Draft {
  room_type: string; description: string; price: string; price_period: string;
  total_rooms: string; available_rooms: string; size_m2: string; facilities: string[]; photos: string[];
}
function toDraft(r?: Room): Draft {
  return {
    room_type: r?.room_type ?? '', description: r?.description ?? '',
    price: r ? String(r.price) : '', price_period: r?.price_period ?? 'bulan',
    total_rooms: r ? String(r.total_rooms) : '1', available_rooms: r ? String(r.available_rooms) : '1',
    size_m2: r?.size_m2 != null ? String(r.size_m2) : '', facilities: r?.facilities ?? [], photos: r?.photos ?? [],
  };
}

export default function OwnerKamarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setRooms(await api.get<Room[]>(`/bakos/owner/listings/${id}/rooms`) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat kamar.');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  function openNew() { setDraft(toDraft()); setEditingId('new'); setError(null); }
  function openEdit(r: Room) { setDraft(toDraft(r)); setEditingId(r.id); setError(null); }
  function close() { setEditingId(null); }

  async function save() {
    if (!draft.room_type.trim()) { setError('Nama tipe kamar wajib'); return; }
    if (!(Number(draft.price) > 0)) { setError('Harga harus > 0'); return; }
    if (!(Number(draft.total_rooms) >= 1)) { setError('Jumlah kamar minimal 1'); return; }
    setBusy(true); setError(null);
    const body = {
      room_type: draft.room_type, description: draft.description || null,
      price: Number(draft.price), price_period: draft.price_period,
      total_rooms: Number(draft.total_rooms), available_rooms: Number(draft.available_rooms || draft.total_rooms),
      size_m2: draft.size_m2 ? Number(draft.size_m2) : null,
      facilities: draft.facilities, photos: draft.photos,
    };
    try {
      if (editingId === 'new') await api.post(`/bakos/owner/listings/${id}/rooms`, body);
      else await api.put(`/bakos/owner/listings/${id}/rooms/${editingId}`, body);
      close(); await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan kamar.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(roomId: string) {
    if (!confirm('Hapus tipe kamar ini?')) return;
    try { await api.delete(`/bakos/owner/listings/${id}/rooms/${roomId}`); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal menghapus kamar.'); }
  }

  const fmt = (v: string) => v.replace(/\D/g, '');

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><button onClick={() => router.push('/login?redirect=/owner/bakos')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk dulu</button></div>;

  const totalRooms = rooms.reduce((s, r) => s + (r.total_rooms || 0), 0);

  return (
    <div className="min-h-screen pb-16" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push(`/owner/bakos/${id}`)} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kelola Kos
        </button>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Kamar</h1>
            <p className="text-[13px]" style={{ color: BAKOS_TOKENS.textSecondary }}>{rooms.length} tipe · {totalRooms} kamar total</p>
          </div>
          {editingId === null && (
            <button onClick={openNew} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition-transform" style={{ background: BRAND }}>
              <Plus size={15} /> Tambah Tipe
            </button>
          )}
        </div>

        {error && editingId === null && (
          <div className="rounded-2xl p-3 flex items-start gap-2 mb-3" style={{ background: '#FDECEC', border: '1px solid #F7C1C1' }}><AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" /><p className="text-xs text-red-800">{error}</p></div>
        )}

        {/* Editor */}
        {editingId !== null && (
          <div className="rounded-2xl bg-white p-4 sm:p-5 mb-4 space-y-3.5" style={{ border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BAKOS_TOKENS.textTertiary }}>{editingId === 'new' ? 'Tipe Kamar Baru' : 'Edit Tipe Kamar'}</p>
              <button onClick={close}><X size={18} className="text-gray-400" /></button>
            </div>
            <Field label="Nama Tipe"><input value={draft.room_type} onChange={e => setDraft({ ...draft, room_type: e.target.value })} placeholder="Standar / AC / VIP" className={INPUT} /></Field>
            <Field label="Deskripsi"><textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} className={INPUT} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga (Rp)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                  <input value={draft.price} onChange={e => setDraft({ ...draft, price: fmt(e.target.value) })} placeholder="500000" className={`${INPUT} pl-9`} />
                </div>
              </Field>
              <Field label="Per"><ChipRow options={['bulan', 'malam', 'hari']} active={[draft.price_period]} onTap={(v) => setDraft({ ...draft, price_period: v })} capitalize /></Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Total"><input type="number" min="1" value={draft.total_rooms} onChange={e => setDraft({ ...draft, total_rooms: e.target.value, available_rooms: e.target.value })} className={INPUT} /></Field>
              <Field label="Tersedia"><input type="number" min="0" value={draft.available_rooms} onChange={e => setDraft({ ...draft, available_rooms: e.target.value })} className={INPUT} /></Field>
              <Field label="m²"><input type="number" min="1" value={draft.size_m2} onChange={e => setDraft({ ...draft, size_m2: e.target.value })} className={INPUT} /></Field>
            </div>
            <Field label="Fasilitas Kamar"><ChipRow options={ROOM_FACILITIES} active={draft.facilities} onTap={(f) => setDraft({ ...draft, facilities: draft.facilities.includes(f) ? draft.facilities.filter(x => x !== f) : [...draft.facilities, f] })} /></Field>
            <Field label="Foto Kamar"><ImageUpload bucket="listings" label="" onUpload={(urls: string[]) => setDraft({ ...draft, photos: urls })} existingUrls={draft.photos} maxFiles={5} /></Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button onClick={save} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BRAND }}>{busy ? 'Menyimpan...' : 'Simpan Kamar'}</button>
              <button onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-medium border" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary }}>Batal</button>
            </div>
          </div>
        )}

        {/* List */}
        {editingId === null && (
          rooms.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-white" style={{ border: `1px solid ${BAKOS_TOKENS.border}` }}>
              <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Belum ada tipe kamar</p>
              <p className="text-xs mt-1" style={{ color: BAKOS_TOKENS.textSecondary }}>Tap "Tambah Tipe" untuk mulai.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rooms.map(r => (
                <div key={r.id} className="rounded-2xl bg-white p-3.5 flex items-start gap-3" style={{ border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: BAKOS_TOKENS.textPrimary }}>{r.room_type}</p>
                    <p className="text-sm mt-0.5 font-semibold" style={{ color: BRAND }}>{formatRp(r.price)}<span className="font-normal" style={{ color: BAKOS_TOKENS.textSecondary }}>/{r.price_period}</span></p>
                    <p className="text-[11px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>{r.available_rooms}/{r.total_rooms} kamar tersedia{r.size_m2 ? ` · ${r.size_m2}m²` : ''}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg" style={{ background: BAKOS_TOKENS.accentBg }}><Pencil size={14} style={{ color: BRAND }} /></button>
                    <button onClick={() => remove(r.id)} className="p-2 rounded-lg bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Premium primitives (selaras flow) ──────────────────────────
const INPUT = 'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition border-[#E4E0D5] focus:border-[#854F0B] focus:ring-2 focus:ring-[#854F0B]/15 placeholder:text-gray-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[13px] font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{label}</label>
      <div className="mt-1.5">{children}</div>
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
