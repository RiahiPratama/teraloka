'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Lease Form Modal (tambah / edit penyewa)
// PATH: src/components/bakos/owner/LeaseFormModal.tsx
// PENANDA: L5-FE-LEASE-MODAL
// ────────────────────────────────────────────────────────────────
// Tambah: pilih kamar (GET rooms) → isi → POST /bakos/owner/lease
// Edit:   prefill dari `editing` → PUT /bakos/owner/lease/:id
//   (edit TIDAK pindah kamar — sesuai engine; kamar locked saat edit)
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useApi, ApiError } from '@/lib/api/client';
import { BAKOS_TOKENS } from './types';
import { type Lease } from './lease-types';
import { X, Loader2, Save, UserPlus } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const INPUT = 'w-full h-11 px-3 text-sm rounded-xl border bg-white outline-none focus:border-[#854F0B] focus:ring-2 focus:ring-[#854F0B]/15 transition';

interface Room { id: string; room_type: string; available_rooms: number; total_rooms: number; is_active: boolean; }


// Format ribuan untuk input nominal (2500000 -> "2.500.000"). Simpan angka murni di state.
function formatThousand(n: number): string {
  if (!n || n <= 0) return '';
  return n.toLocaleString('id-ID');
}
function parseThousand(s: string): number {
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function LeaseFormModal({
  listingId, editing, onClose, onSaved,
}: {
  listingId: string;
  editing: Lease | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useApi();
  const isEdit = !!editing;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roomId, setRoomId] = useState(editing?.room_id ?? '');
  const [tenantName, setTenantName] = useState(editing?.tenant_name ?? '');
  const [tenantPhone, setTenantPhone] = useState(editing?.tenant_phone ?? '');
  const [startDate, setStartDate] = useState(editing?.start_date ?? new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(editing?.duration_months ?? 6);
  const [rentAmount, setRentAmount] = useState(editing?.rent_amount ?? 0);
  const [deposit, setDeposit] = useState(editing?.deposit ?? 0);
  const [dueDay, setDueDay] = useState(editing?.due_day ?? 5);
  const [note, setNote] = useState(editing?.note ?? '');

  // Ambil kamar kos ini (cuma buat mode tambah — edit gak pindah kamar)
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      try {
        setLoadingRooms(true);
        const data = await api.get<Room[]>(`/bakos/owner/listings/${listingId}/rooms`);
        setRooms(data.filter(r => r.is_active));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Gagal memuat kamar.');
      } finally {
        setLoadingRooms(false);
      }
    })();
  }, [api, listingId, isEdit]);

  async function handleSubmit() {
    setError(null);
    if (!isEdit && !roomId) { setError('Pilih kamar dulu.'); return; }
    if (!tenantName.trim()) { setError('Nama penyewa wajib.'); return; }
    if (!tenantPhone.trim()) { setError('Nomor WA penyewa wajib.'); return; }
    if (dueDay < 1 || dueDay > 28) { setError('Tanggal jatuh tempo harus 1–28.'); return; }
    if (!isEdit && durationMonths <= 0) { setError('Durasi harus > 0.'); return; }

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/bakos/owner/lease/${editing!.id}`, {
          tenant_name: tenantName.trim(),
          tenant_phone: tenantPhone,
          due_day: Number(dueDay),
          rent_amount: Number(rentAmount),
          deposit: Number(deposit),
          note: note || null,
        });
      } else {
        await api.post('/bakos/owner/lease', {
          listing_id: listingId,
          room_id: roomId,
          tenant_name: tenantName.trim(),
          tenant_phone: tenantPhone,
          start_date: startDate,
          duration_months: Number(durationMonths),
          rent_amount: Number(rentAmount),
          deposit: Number(deposit),
          due_day: Number(dueDay),
          note: note || null,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" style={{ background: 'rgba(44,44,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white pb-[env(safe-area-inset-bottom)]" style={{ background: BAKOS_TOKENS.pageBg }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b backdrop-blur" style={{ background: 'rgba(239,237,229,0.95)', borderColor: BAKOS_TOKENS.border }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: BAKOS_TOKENS.textPrimary }}>
            <UserPlus size={18} style={{ color: BRAND }} /> {isEdit ? 'Edit Penyewa' : 'Tambah Penyewa'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"><X size={18} style={{ color: BAKOS_TOKENS.textSecondary }} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* kamar (tambah saja) */}
          {!isEdit && (
            <Field label="Kamar">
              {loadingRooms ? (
                <div className="flex items-center gap-2 text-xs py-2" style={{ color: BAKOS_TOKENS.textTertiary }}><Loader2 size={14} className="animate-spin" /> Memuat kamar...</div>
              ) : rooms.length === 0 ? (
                <p className="text-xs py-2" style={{ color: '#A32D2D' }}>Belum ada tipe kamar. Tambah kamar dulu di "Kelola Kamar".</p>
              ) : (
                <div className="space-y-2">
                  {rooms.map(r => {
                    const full = r.available_rooms <= 0;
                    return (
                      <button key={r.id} type="button" disabled={full} onClick={() => setRoomId(r.id)}
                        className="w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition active:scale-[0.99] disabled:opacity-50"
                        style={roomId === r.id
                          ? { borderColor: BRAND, background: BAKOS_TOKENS.accentBg }
                          : { borderColor: BAKOS_TOKENS.border, background: '#fff' }}>
                        <span className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{r.room_type}</span>
                        <span className="text-[11px] font-medium" style={{ color: full ? '#A32D2D' : BAKOS_TOKENS.textSecondary }}>
                          {full ? 'Penuh' : `${r.available_rooms} slot kosong`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
          )}
          {isEdit && (
            <div className="rounded-xl px-3.5 py-2.5 text-xs" style={{ background: BAKOS_TOKENS.surfaceAlt, color: BAKOS_TOKENS.textSecondary }}>
              Kamar: <b style={{ color: BAKOS_TOKENS.textPrimary }}>{editing?.room_name ?? '—'}</b> · Untuk pindah kamar, checkout lalu daftar ulang.
            </div>
          )}

          <Field label="Nama Penyewa">
            <input value={tenantName} onChange={e => setTenantName(e.target.value)} className={INPUT} placeholder="Nama lengkap" />
          </Field>

          <Field label="Nomor WhatsApp" hint="Untuk pengingat sewa (fitur Pro)">
            <input type="tel" value={tenantPhone} onChange={e => setTenantPhone(e.target.value.replace(/[^\d+]/g, ''))} className={INPUT} placeholder="08xxxxxxxxxx" />
          </Field>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai Sewa">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Durasi (bulan)">
                <input type="number" min={1} value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))} className={INPUT} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sewa / bulan">
              <input type="text" inputMode="numeric" value={formatThousand(rentAmount)} onChange={e => setRentAmount(parseThousand(e.target.value))} className={INPUT} placeholder="800.000" />
            </Field>
            <Field label="Deposit">
              <input type="text" inputMode="numeric" value={formatThousand(deposit)} onChange={e => setDeposit(parseThousand(e.target.value))} className={INPUT} placeholder="0" />
            </Field>
          </div>

          <Field label="Jatuh Tempo (tiap tanggal)" hint="1–28">
            <input type="number" min={1} max={28} value={dueDay} onChange={e => setDueDay(Number(e.target.value))} className={INPUT} />
          </Field>

          <Field label="Catatan (opsional)">
            <textarea value={note ?? ''} onChange={e => setNote(e.target.value)} rows={2} className={INPUT.replace('h-11', '')} placeholder="Catatan internal" />
          </Field>

          {error && <p className="text-xs" style={{ color: '#A32D2D' }}>{error}</p>}
        </div>

        {/* footer */}
        <div className="sticky bottom-0 px-5 py-4 border-t backdrop-blur" style={{ background: 'rgba(239,237,229,0.95)', borderColor: BAKOS_TOKENS.border }}>
          <button onClick={handleSubmit} disabled={saving} className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: BRAND }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Check-in Penyewa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BAKOS_TOKENS.textPrimary }}>
        {label}{hint && <span className="font-normal ml-1.5" style={{ color: BAKOS_TOKENS.textTertiary }}>· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
