'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Kelola Penyewa (PMS Fase 1)
// PATH: src/app/owner/bakos/[id]/penyewa/page.tsx
// PENANDA: L5-FE-LEASE-PAGE
// ────────────────────────────────────────────────────────────────
// GET  /bakos/owner/lease?listing_id=  → daftar penyewa kos ini
// POST /bakos/owner/lease              → check-in penyewa baru
// PUT  /bakos/owner/lease/:id          → edit
// POST /bakos/owner/lease/:id/end      → checkout
// Visual selaras [id]/page.tsx (Section/kartu, kertas+amber BAKOS_TOKENS).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { BAKOS_TOKENS } from '@/components/bakos/owner/types';
import { type Lease, type LeaseStatus, LEASE_STATUS_VIEW, OCCUPYING } from '@/components/bakos/owner/lease-types';
import LeaseFormModal from '@/components/bakos/owner/LeaseFormModal';
import LeaseReminderModal from '@/components/bakos/owner/LeaseReminderModal';
import { ChevronLeft, Loader2, UserPlus, Phone, Calendar, AlertCircle, Users, Pencil, LogOut, BellRing } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const FILTERS: { key: 'all' | LeaseStatus; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'nunggak', label: 'Nunggak' },
  { key: 'berakhir', label: 'Berakhir' },
  { key: 'keluar', label: 'Keluar' },
];

function fmtRp(n: number) { return 'Rp ' + (n ?? 0).toLocaleString('id-ID'); }
function fmtDate(s: string) {
  try { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

export default function OwnerLeasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [kosTitle, setKosTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | LeaseStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remindLease, setRemindLease] = useState<Lease | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await api.get<Lease[]>(`/bakos/owner/lease?listing_id=${id}`);
      setLeases(data);
      if (data.length > 0 && data[0].kos_title) setKosTitle(data[0].kos_title);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat penyewa.');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  async function handleCheckout(lease: Lease) {
    const mode = window.confirm(`Checkout ${lease.tenant_name} dari ${lease.room_name ?? 'kamar'}?\n\nOK = masa sewa berakhir normal\nCancel = batal`) ? 'berakhir' : null;
    if (!mode) return;
    try {
      setBusyId(lease.id);
      await api.post(`/bakos/owner/lease/${lease.id}/end`, { mode });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal checkout.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = filter === 'all' ? leases : leases.filter(l => l.status === filter);
  const occupying = leases.filter(l => OCCUPYING.includes(l.status)).length;
  const nunggak = leases.filter(l => l.status === 'nunggak').length;

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}>
      <button onClick={() => router.push(`/login?redirect=/owner/bakos/${id}/penyewa`)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk dulu</button>
    </div>;
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push(`/owner/bakos/${id}`)} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kelola Kos
        </button>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: BAKOS_TOKENS.textPrimary }}>
              <Users size={20} style={{ color: BRAND }} /> Penyewa
            </h1>
            <p className="text-[13px] mt-0.5 truncate" style={{ color: BAKOS_TOKENS.textSecondary }}>{kosTitle || 'Kos kamu'}</p>
          </div>
        </div>

        {/* ringkasan */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Menempati" value={occupying} />
          <Stat label="Nunggak" value={nunggak} danger={nunggak > 0} />
          <Stat label="Total" value={leases.length} />
        </div>

        {/* tombol tambah */}
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold active:scale-[0.99] transition-transform shadow-sm mb-4"
          style={{ background: BRAND, color: '#fff' }}>
          <UserPlus size={18} /> Tambah Penyewa
        </button>

        {/* filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition active:scale-95"
              style={filter === f.key
                ? { background: BRAND, color: '#fff', borderColor: BRAND }
                : { background: '#fff', color: BAKOS_TOKENS.textSecondary, borderColor: BAKOS_TOKENS.border }}>
              {f.label}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl p-3 flex items-start gap-2 mb-4" style={{ background: '#FDECEC' }}><AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" /><p className="text-xs text-red-800">{error}</p></div>}

        {/* daftar */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white" style={{ border: `1px solid ${BAKOS_TOKENS.border}` }}>
            <Users size={36} className="mx-auto mb-3" style={{ color: BAKOS_TOKENS.textTertiary }} />
            <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{filter === 'all' ? 'Belum ada penyewa' : `Tidak ada penyewa ${filter}`}</p>
            {filter === 'all' && <p className="text-xs mt-1" style={{ color: BAKOS_TOKENS.textSecondary }}>Tap "Tambah Penyewa" untuk mulai mencatat.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(lease => {
              const sv = LEASE_STATUS_VIEW[lease.status];
              const ended = lease.status === 'berakhir' || lease.status === 'keluar';
              return (
                <div key={lease.id} className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${BAKOS_TOKENS.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: BAKOS_TOKENS.textPrimary }}>{lease.tenant_name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>{lease.room_name ?? 'Kamar'}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: sv.bg, color: sv.fg }}>{sv.label}</span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>
                    <div className="flex items-center gap-1.5"><Phone size={12} /> {lease.tenant_phone}</div>
                    <div className="flex items-center gap-1.5"><Calendar size={12} /> Jatuh tempo tiap tgl <b style={{ color: BAKOS_TOKENS.textPrimary }}>{lease.due_day}</b> · {fmtRp(lease.rent_amount)}/bln</div>
                    <div className="flex items-center gap-1.5 opacity-80"><Calendar size={12} /> {fmtDate(lease.start_date)} → {fmtDate(lease.end_date)}</div>
                  </div>

                  {!ended && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setRemindLease(lease)}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 text-white"
                        style={{ background: BRAND }}>
                        <BellRing size={13} /> Ingatkan
                      </button>
                      <button onClick={() => { setEditing(lease); setModalOpen(true); }}
                        className="flex-1 rounded-xl border py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                        style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textPrimary, background: '#fff' }}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => handleCheckout(lease)} disabled={busyId === lease.id}
                        className="flex-1 rounded-xl border py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                        style={{ borderColor: '#F0C9C9', color: '#A32D2D', background: '#fff' }}>
                        {busyId === lease.id ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Checkout
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <LeaseFormModal
          listingId={id}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}

      {remindLease && (
        <LeaseReminderModal
          lease={remindLease}
          onClose={() => setRemindLease(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center" style={{ border: `1px solid ${BAKOS_TOKENS.border}` }}>
      <p className="text-xl font-extrabold" style={{ color: danger ? '#A32D2D' : BAKOS_TOKENS.textPrimary }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }}>{label}</p>
    </div>
  );
}
