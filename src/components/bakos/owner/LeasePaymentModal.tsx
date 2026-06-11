'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Catat Bayar Modal (riwayat tagihan + tandai lunas)
// PATH: src/components/bakos/owner/LeasePaymentModal.tsx
// PENANDA: L5-FE-LEASE-PAYMENT-MODAL
// ────────────────────────────────────────────────────────────────
// GET  /bakos/owner/lease/:id/payments      → riwayat tagihan
// POST /bakos/owner/lease/:id/pay            → tandai lunas (+ opsi WA)
// POST /bakos/owner/lease/:id/unpay          → batalin lunas
// 🛡️ NON-money (catatan owner). Konfirmasi WA opsional (gated Pro+ di backend).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useApi, ApiError } from '@/lib/api/client';
import { BAKOS_TOKENS } from './types';
import { type Lease } from './lease-types';
import { X, Loader2, CheckCircle2, Clock, AlertTriangle, MessageCircle, Wallet } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface PayRow {
  id: string;
  period: string;
  amount: number;
  status: 'belum' | 'lunas' | 'telat';
  marked_paid_at: string | null;
}

function rp(n: number) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'); }
function periodLabel(p: string) {
  const [y, m] = p.split('-').map(Number);
  return `${BULAN[(m - 1) % 12] ?? p} ${y}`;
}

const STATUS_VIEW: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  lunas: { label: 'Lunas', color: '#15803D', bg: '#E1F5EE', Icon: CheckCircle2 },
  belum: { label: 'Belum bayar', color: '#92740C', bg: '#FBF3D9', Icon: Clock },
  telat: { label: 'Telat', color: '#A32D2D', bg: '#FDECEC', Icon: AlertTriangle },
};

export default function LeasePaymentModal({
  lease, canSendWa, onClose, onChanged,
}: {
  lease: Lease;
  canSendWa: boolean;      // tier Pro+ (badge upgrade kalau false)
  onClose: () => void;
  onChanged: () => void;   // refresh list setelah perubahan
}) {
  const api = useApi();
  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPeriod, setBusyPeriod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendWa, setSendWa] = useState(canSendWa); // default ON kalau Pro+
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await api.get<PayRow[]>(`/bakos/owner/lease/${lease.id}/payments`);
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat tagihan.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [lease.id]);

  async function pay(period: string) {
    try {
      setBusyPeriod(period); setError(null);
      const res = await api.post<{ confirmation_sent?: boolean }>(`/bakos/owner/lease/${lease.id}/pay`, {
        period, send_confirmation: sendWa,
      });
      setToast(res.confirmation_sent ? 'Lunas dicatat + konfirmasi WA terkirim ✓' : 'Pembayaran dicatat ✓');
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menandai lunas.');
    } finally {
      setBusyPeriod(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  async function unpay(period: string) {
    try {
      setBusyPeriod(period); setError(null);
      await api.post(`/bakos/owner/lease/${lease.id}/unpay`, { period });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal membatalkan.');
    } finally {
      setBusyPeriod(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(44,44,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" style={{ background: BAKOS_TOKENS.pageBg }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b backdrop-blur" style={{ background: 'rgba(239,237,229,0.95)', borderColor: BAKOS_TOKENS.border }}>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: BAKOS_TOKENS.textPrimary }}>
              <Wallet size={18} style={{ color: BRAND }} /> Catat Bayar
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>{lease.tenant_name} · {lease.room_name ?? ''}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"><X size={18} style={{ color: BAKOS_TOKENS.textSecondary }} /></button>
        </div>

        <div className="px-5 py-4">
          {/* opsi konfirmasi WA */}
          {canSendWa ? (
            <label className="flex items-center gap-2.5 rounded-xl p-3 mb-3 cursor-pointer" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
              <input type="checkbox" checked={sendWa} onChange={e => setSendWa(e.target.checked)} className="w-4 h-4 accent-current" style={{ accentColor: BRAND }} />
              <MessageCircle size={15} style={{ color: BRAND }} />
              <span className="text-xs" style={{ color: BAKOS_TOKENS.textPrimary }}>Kirim konfirmasi WA ke penyewa saat ditandai lunas</span>
            </label>
          ) : (
            <div className="rounded-xl p-3 mb-3 text-[11px]" style={{ background: BAKOS_TOKENS.surfaceAlt, color: BAKOS_TOKENS.textSecondary }}>
              💡 Konfirmasi WA otomatis ke penyewa tersedia di paket Pro & Bisnis.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: BRAND }} /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-xs py-8" style={{ color: BAKOS_TOKENS.textSecondary }}>Belum ada tagihan. Tagihan dibuat otomatis tiap bulan.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => {
                const sv = STATUS_VIEW[r.status] ?? STATUS_VIEW.belum;
                const busy = busyPeriod === r.period;
                return (
                  <div key={r.id} className="rounded-2xl p-3.5" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>{periodLabel(r.period)}</p>
                        <p className="text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>{rp(r.amount)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: sv.color, background: sv.bg }}>
                        <sv.Icon size={12} /> {sv.label}
                      </span>
                    </div>
                    {r.status === 'lunas' ? (
                      <button onClick={() => unpay(r.period)} disabled={busy}
                        className="w-full rounded-xl py-2 text-xs font-semibold border disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textSecondary, background: BAKOS_TOKENS.pageBg }}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : null} Batalkan Lunas
                      </button>
                    ) : (
                      <button onClick={() => pay(r.period)} disabled={busy}
                        className="w-full rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ background: BRAND }}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />} Tandai Lunas
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <div className="rounded-xl p-3 mt-3 text-xs text-red-800" style={{ background: '#FDECEC' }}>{error}</div>}
        </div>

        {toast && (
          <div className="sticky bottom-0 px-5 py-3 text-center text-xs font-semibold" style={{ background: '#E1F5EE', color: '#15803D' }}>{toast}</div>
        )}
      </div>
    </div>
  );
}
