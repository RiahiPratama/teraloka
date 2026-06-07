'use client';

// ═══════════════════════════════════════════════════════════════
// WAJAH-2 (modal) — Review & Verifikasi Driver BALAJU
// Dibuka dari antrian (/admin/balaju/drivers). Triase cepat: buka → cek → putuskan.
//
// Konsumsi (semua LIVE):
//   GET  /admin/balaju/drivers/:id          → { driver, vehicles[], documents[] }
//   POST /admin/balaju/drivers/:id/verify   body { tier? }   (guard: pending)
//   POST /admin/balaju/drivers/:id/reject   body { reason }  (guard: pending)
//   POST /admin/balaju/drivers/:id/suspend  body { reason }  (guard: verified)
//   POST /admin/balaju/drivers/:id/reinstate                 (guard: suspended)
//
// Aksi = INLINE di footer (bukan modal-dalam-modal). Sukses → onActionDone(msg) → parent
// refresh list + toast + tutup. signed_url di-generate backend (bisa null utk file dummy).
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  X, CheckCircle2, XCircle, Ban, RotateCcw, ShieldCheck,
  Phone, MapPin, Calendar, Star, Bike, FileText, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';

type VStatus = 'pending' | 'verified' | 'suspended' | 'rejected';
type Tier = 'bronze' | 'silver' | 'gold';
type ActionType = 'verify' | 'reject' | 'suspend' | 'reinstate' | null;

interface DriverDetail {
  id: string; user_id: string; name: string; phone: string;
  service_capabilities: string[]; verification_status: VStatus; verification_tier: Tier;
  dob: string | null; address: string | null; rejection_reason: string | null;
  verified_at: string | null; rides_completed: number; rating_avg: number;
  rating_count: number; is_active: boolean; is_online: boolean; created_at: string;
}
interface Vehicle {
  id: string; vehicle_type: string; plate_number: string; brand_model: string | null;
  color: string | null; year: number | null; capacity: number | null; is_active: boolean;
}
interface DriverDoc {
  id: string; doc_type: string; doc_number: string | null;
  expiry_date: string | null; status: string; signed_url: string | null;
}
interface DetailResponse { driver: DriverDetail; vehicles: Vehicle[]; documents: DriverDoc[]; }

const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };
const VEHICLE_LABELS: Record<string, string> = { motorcycle: 'Motor', car: 'Mobil' };
const DOC_LABELS: Record<string, string> = {
  ktp: 'KTP', sim_c: 'SIM C', stnk: 'STNK', selfie: 'Foto Selfie', vehicle_photo: 'Foto Kendaraan',
};
const STATUS_BADGE: Record<VStatus, 'warning' | 'healthy' | 'info' | 'critical'> = {
  pending: 'warning', verified: 'healthy', suspended: 'info', rejected: 'critical',
};
const STATUS_LABEL: Record<VStatus, string> = {
  pending: 'Pending', verified: 'Verified', suspended: 'Suspended', rejected: 'Rejected',
};

export default function DriverReviewModal({
  driverId, onClose, onActionDone,
}: {
  driverId: string;
  onClose: () => void;
  onActionDone: (msg: string) => void;
}) {
  const api = useApi();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<ActionType>(null);
  const [tier, setTier] = useState<Tier>('bronze');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DetailResponse>(`/admin/balaju/drivers/${driverId}`);
      setData(res);
      if (res.driver?.verification_tier) setTier(res.driver.verification_tier);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setError('Driver tidak ditemukan.');
      else setError(e instanceof ApiError ? e.message : 'Gagal memuat detail driver');
    } finally {
      setLoading(false);
    }
  }, [api, driverId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Esc buat nutup (kalau gak lagi submit)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  function startAction(a: ActionType) {
    setActionError(null);
    setReason('');
    if (data?.driver?.verification_tier) setTier(data.driver.verification_tier);
    setAction(a);
  }

  async function confirmAction() {
    if (!action) return;
    if ((action === 'reject' || action === 'suspend') && reason.trim().length < 3) {
      setActionError('Alasan wajib diisi (min 3 huruf).');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const base = `/admin/balaju/drivers/${driverId}`;
      if (action === 'verify') await api.post(`${base}/verify`, { tier });
      else if (action === 'reject') await api.post(`${base}/reject`, { reason: reason.trim() });
      else if (action === 'suspend') await api.post(`${base}/suspend`, { reason: reason.trim() });
      else if (action === 'reinstate') await api.post(`${base}/reinstate`, {});

      const msg: Record<Exclude<ActionType, null>, string> = {
        verify: '✓ Driver berhasil diverifikasi',
        reject: '✓ Pengajuan ditolak',
        suspend: '✓ Driver disuspend',
        reinstate: '✓ Driver dipulihkan',
      };
      onActionDone(msg[action]); // parent: refresh list + toast + tutup
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Aksi gagal, coba lagi');
      setSubmitting(false);
    }
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  const driver = data?.driver;
  const st = driver?.verification_status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !submitting && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-surface-elevated shadow-xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          {driver ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bapasiar-muted text-base font-bold text-bapasiar">
                {(driver.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">{driver.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="status" status={STATUS_BADGE[driver.verification_status]}>
                    {STATUS_LABEL[driver.verification_status]}
                  </Badge>
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold capitalize text-text-muted">
                    {driver.verification_tier}
                  </span>
                  {driver.is_online && <span className="text-xs font-medium text-status-healthy">● online</span>}
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-text">Review Driver</h2>
          )}
          <button onClick={onClose} disabled={submitting}
            className="rounded-lg p-1.5 text-text-light hover:bg-surface-muted hover:text-text disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="py-12 text-center text-sm text-text-muted">Memuat detail driver…</div>}

          {!loading && error && (
            <div className="py-10 text-center">
              <AlertTriangle size={26} className="mx-auto mb-2 text-status-critical" />
              <p className="text-sm font-semibold text-text">{error}</p>
            </div>
          )}

          {!loading && !error && driver && (
            <>
              {(st === 'rejected' || st === 'suspended') && driver.rejection_reason && (
                <div className="mb-4 rounded-lg border border-status-critical/30 bg-status-critical/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-status-critical">
                    {st === 'rejected' ? 'Alasan penolakan' : 'Alasan suspend'}
                  </p>
                  <p className="mt-1 text-sm text-text">{driver.rejection_reason}</p>
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-5">
                {/* Kiri: profil + kendaraan */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
                      <ShieldCheck size={15} className="text-bapasiar" /> Data Driver
                    </h3>
                    <dl className="space-y-2.5 text-sm">
                      <Row icon={<Phone size={14} />} label="Telepon" value={driver.phone} mono />
                      <Row icon={<Calendar size={14} />} label="Tgl Lahir" value={fmtDate(driver.dob)} />
                      <Row icon={<MapPin size={14} />} label="Alamat" value={driver.address ?? '-'} />
                      <Row icon={<Bike size={14} />} label="Layanan"
                        value={(driver.service_capabilities ?? []).map((s) => SERVICE_LABELS[s] ?? s).join(', ') || '-'} />
                      <Row icon={<Star size={14} />} label="Track"
                        value={`${driver.rides_completed} trip${driver.rating_avg > 0 ? ` • ⭐ ${Number(driver.rating_avg).toFixed(1)} (${driver.rating_count})` : ''}`} />
                      <Row icon={<Calendar size={14} />} label="Daftar" value={fmtDate(driver.created_at)} />
                      {driver.verified_at && <Row icon={<CheckCircle2 size={14} />} label="Keputusan" value={fmtDate(driver.verified_at)} />}
                    </dl>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-bold text-text">Kendaraan</h3>
                    {data.vehicles.length === 0 ? (
                      <p className="text-sm text-text-muted">Belum ada data kendaraan.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.vehicles.map((v) => (
                          <div key={v.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-text">
                                {VEHICLE_LABELS[v.vehicle_type] ?? v.vehicle_type}{v.brand_model ? ` · ${v.brand_model}` : ''}
                              </span>
                              {v.is_active && <span className="text-xs text-status-healthy">aktif</span>}
                            </div>
                            <div className="mt-1.5 inline-block rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-text">
                              {v.plate_number}
                            </div>
                            <p className="mt-1.5 text-xs text-text-muted">
                              {[v.color, v.year, v.capacity ? `${v.capacity} kursi` : null].filter(Boolean).join(' · ') || '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Kanan: dokumen KYC */}
                <div className="lg:col-span-3">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-text">
                      <FileText size={15} className="text-bapasiar" /> Dokumen KYC
                    </h3>
                    <p className="mb-3 text-xs text-text-muted">
                      Data identitas — rahasia. Cocokkan nama & foto dengan data driver sebelum verifikasi.
                    </p>
                    {data.documents.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center">
                        <p className="text-sm text-text-muted">
                          Tidak ada dokumen — kemungkinan driver didaftarkan manual sebelum sistem KYC aktif.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {data.documents.map((doc) => (
                          <div key={doc.id} className="overflow-hidden rounded-lg border border-border">
                            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-text">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</span>
                              {doc.expiry_date && <span className="text-[10px] text-text-light">exp {fmtDate(doc.expiry_date)}</span>}
                            </div>
                            {doc.signed_url ? (
                              <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={doc.signed_url} alt={DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                                  className="h-40 w-full bg-surface-muted object-cover" />
                              </a>
                            ) : (
                              <div className="flex h-40 w-full items-center justify-center bg-surface-muted text-xs text-text-light">
                                Pratinjau tidak tersedia
                              </div>
                            )}
                            {doc.doc_number && <p className="px-3 py-2 font-mono text-xs text-text-muted">No: {doc.doc_number}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer aksi (sticky) — adaptif per status, input INLINE */}
        {!loading && !error && driver && (
          <div className="border-t border-border px-5 py-4">
            {/* Mode default: tombol pemicu */}
            {action === null && (
              <div className="flex flex-wrap justify-end gap-2">
                {st === 'pending' && (
                  <>
                    <button onClick={() => startAction('reject')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-status-critical px-4 py-2 text-sm font-semibold text-status-critical hover:bg-status-critical/10">
                      <XCircle size={16} /> Tolak
                    </button>
                    <button onClick={() => startAction('verify')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bapasiar px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                      <CheckCircle2 size={16} /> Verifikasi
                    </button>
                  </>
                )}
                {st === 'verified' && (
                  <button onClick={() => startAction('suspend')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">
                    <Ban size={16} /> Suspend
                  </button>
                )}
                {st === 'suspended' && (
                  <button onClick={() => startAction('reinstate')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-bapasiar px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    <RotateCcw size={16} /> Pulihkan
                  </button>
                )}
                {st === 'rejected' && <p className="text-sm text-text-muted">Pengajuan ini sudah ditolak.</p>}
              </div>
            )}

            {/* Mode aksi: input inline + konfirmasi */}
            {action !== null && (
              <div>
                {action === 'verify' && (
                  <div className="mb-3">
                    <p className="mb-2 text-sm text-text-muted">Pilih tier untuk driver ini:</p>
                    <div className="flex gap-2">
                      {(['bronze', 'silver', 'gold'] as Tier[]).map((tt) => (
                        <button key={tt} onClick={() => setTier(tt)}
                          className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize',
                            tier === tt ? 'border-bapasiar bg-bapasiar-muted text-bapasiar' : 'border-border text-text-muted hover:bg-surface-muted')}>
                          {tt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(action === 'reject' || action === 'suspend') && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-sm text-text-muted">
                      Alasan {action === 'reject' ? 'penolakan' : 'suspend'} <span className="text-status-critical">*</span>
                    </label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus
                      placeholder={action === 'reject' ? 'cth: KTP tidak terbaca, nama tidak cocok…' : 'cth: laporan negatif berulang…'}
                      className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-text outline-none focus:border-bapasiar" />
                  </div>
                )}
                {action === 'reinstate' && (
                  <p className="mb-3 text-sm text-text-muted">Driver akan kembali <strong className="text-text">verified</strong> & bisa terima order lagi.</p>
                )}

                {actionError && <p className="mb-2 text-sm text-status-critical">{actionError}</p>}

                <div className="flex justify-end gap-2">
                  <button onClick={() => { setAction(null); setActionError(null); }} disabled={submitting}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted disabled:opacity-50">
                    Batal
                  </button>
                  <button onClick={confirmAction} disabled={submitting}
                    className={cn('rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50',
                      action === 'reject' ? 'bg-status-critical hover:opacity-90' : 'bg-bapasiar hover:opacity-90')}>
                    {submitting ? 'Memproses…'
                      : action === 'verify' ? 'Konfirmasi Verifikasi'
                      : action === 'reject' ? 'Konfirmasi Tolak'
                      : action === 'suspend' ? 'Konfirmasi Suspend'
                      : 'Konfirmasi Pulihkan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-text-light">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-text-light">{label}</dt>
        <dd className={cn('break-words text-text', mono && 'font-mono text-sm')}>{value}</dd>
      </div>
    </div>
  );
}
