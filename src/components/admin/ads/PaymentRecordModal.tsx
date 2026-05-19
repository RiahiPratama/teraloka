'use client';

/**
 * TeraLoka — PaymentRecordModal
 * SESI 5F (19 Mei 2026) — BATCH 4 Delivery 1
 * ------------------------------------------------------------
 * Modal untuk catat pembayaran iklan yang udah disetujui.
 *
 * Features:
 *   - Field: price_paid (number Rupiah)
 *   - Field: paid_at (native date picker, default today)
 *   - Field: payment_method (4 pill button: transfer/cash/ewallet/lainnya)
 *   - Field: bank_account_id (dropdown, WAJIB kalau method='transfer')
 *   - Field: payment_proof_url (text URL or skip via audit_pending)
 *   - Field: audit_pending (checkbox "Bukti masih di WA")
 *   - Field: notes (textarea opsional)
 *   - Escape key + click backdrop untuk cancel
 *   - Loading state saat submit
 *   - Inline validation error
 *
 * Pattern mirror RejectAdModal/DeleteAdModal (Tailwind v4 utility).
 *
 * Backend endpoint: POST /admin/ads/:id/record-payment (SESI 5F extended)
 */

import { useState, useEffect, useRef } from 'react';
import {
  Wallet, X, AlertTriangle, Loader2, Building2, Banknote,
  Smartphone, CreditCard, Calendar, Link2, MessageSquareWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────────

interface BankAccountDropdown {
  id:                   string;
  bank_name:            string;
  account_number:       string;
  account_holder_alias: string;
  is_active:            boolean;
  display_order:        number;
}

interface DropdownResponse {
  success: boolean;
  data?: {
    accounts: BankAccountDropdown[];
    total:    number;
  };
  error?: { code: string; message: string };
}

interface RecordPaymentResponse {
  success: boolean;
  data?: {
    ad_id:            string;
    price_paid:       number;
    out_of_range:     boolean;
    range_warning:    string | null;
    money_emitted:    boolean;
    audit_pending:    boolean;
    bank_account_id:  string | null;
  };
  error?: { code: string; message: string };
}

export interface PaymentRecordModalProps {
  ad:      AdRow | null;
  token:   string | null;
  onSuccess: (msg: string) => void;
  onError:   (msg: string) => void;
  onClose:   () => void;
}

type PaymentMethod = 'transfer' | 'cash' | 'ewallet' | 'lainnya';

const METHODS: Array<{
  value: PaymentMethod;
  label: string;
  icon:  typeof Building2;
}> = [
  { value: 'transfer', label: 'Transfer',  icon: Building2 },
  { value: 'cash',     label: 'Cash',      icon: Banknote  },
  { value: 'ewallet',  label: 'E-wallet',  icon: Smartphone },
  { value: 'lainnya',  label: 'Lainnya',   icon: CreditCard },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!; // YYYY-MM-DD
}

// ─── Component ───────────────────────────────────────────────────

export default function PaymentRecordModal({
  ad,
  token,
  onSuccess,
  onError,
  onClose,
}: PaymentRecordModalProps) {
  // Form state
  const [pricePaid, setPricePaid]           = useState<string>('');
  const [paidAt, setPaidAt]                 = useState<string>(todayISO());
  const [method, setMethod]                 = useState<PaymentMethod>('transfer');
  const [bankAccountId, setBankAccountId]   = useState<string>('');
  const [proofUrl, setProofUrl]             = useState<string>('');
  const [auditPending, setAuditPending]     = useState<boolean>(false);
  const [notes, setNotes]                   = useState<string>('');

  // Bank dropdown state
  const [banks, setBanks]                   = useState<BankAccountDropdown[]>([]);
  const [banksLoading, setBanksLoading]     = useState<boolean>(false);

  // UI state
  const [error, setError]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState<boolean>(false);
  const inputRef                            = useRef<HTMLInputElement>(null);

  // ─── Effects ─────────────────────────────────────────────────

  // Fetch bank accounts dropdown saat modal open
  useEffect(() => {
    if (!ad || !token) return;

    const fetchBanks = async () => {
      setBanksLoading(true);
      try {
        const res = await fetch(`${API}/admin/bank-accounts/dropdown`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json: DropdownResponse = await res.json();

        if (json.success && json.data?.accounts) {
          setBanks(json.data.accounts);
          // Auto-select first active bank kalau ada
          if (json.data.accounts.length > 0 && !bankAccountId) {
            setBankAccountId(json.data.accounts[0]!.id);
          }
        } else {
          console.error('[PaymentRecordModal] dropdown fetch failed:', json.error?.message);
        }
      } catch (err) {
        console.error('[PaymentRecordModal] dropdown error:', err);
      } finally {
        setBanksLoading(false);
      }
    };

    fetchBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad, token]);

  // Reset state saat modal close/reopen
  useEffect(() => {
    if (!ad) {
      setPricePaid('');
      setPaidAt(todayISO());
      setMethod('transfer');
      setBankAccountId('');
      setProofUrl('');
      setAuditPending(false);
      setNotes('');
      setError(null);
      setLoading(false);
    }
  }, [ad]);

  // Focus price input on open
  useEffect(() => {
    if (ad && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [ad]);

  // Escape key handler
  useEffect(() => {
    if (!ad) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ad, loading, onClose]);

  if (!ad) return null;

  // ─── Submit handler ──────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);

    // Validation
    const priceNum = Number(pricePaid.replace(/[^\d]/g, ''));
    if (!priceNum || priceNum <= 0) {
      setError('Harga pembayaran wajib diisi (Rupiah positif)');
      return;
    }

    const hasProof = proofUrl.trim().length > 0;
    if (!hasProof && !auditPending) {
      setError('Upload bukti transfer, atau centang "Bukti masih di WA" untuk skip sementara');
      return;
    }

    if (method === 'transfer' && !bankAccountId) {
      setError('Pilih rekening penerima untuk metode transfer');
      return;
    }

    if (!token) {
      setError('Session expired, login ulang');
      return;
    }

    // Build payload
    const payload: Record<string, any> = {
      price_paid:     priceNum,
      payment_method: method,
      notes:          notes.trim() || null,
    };

    if (hasProof) {
      payload.payment_proof_url = proofUrl.trim();
    }
    if (auditPending) {
      payload.audit_pending = true;
    }
    if (method === 'transfer' && bankAccountId) {
      payload.bank_account_id = bankAccountId;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API}/admin/ads/${ad.id}/record-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const json: RecordPaymentResponse = await res.json();

      if (!json.success || !json.data) {
        const msg = json.error?.message ?? 'Gagal catat pembayaran';
        setError(msg);
        setLoading(false);
        return;
      }

      // Success — toast notification via parent
      const warning = json.data.range_warning
        ? ` (${json.data.range_warning})`
        : '';
      const auditTag = json.data.audit_pending
        ? ' [audit pending — upload bukti dalam 7 hari]'
        : '';

      onSuccess(
        `✓ Pembayaran tercatat: Rp ${json.data.price_paid.toLocaleString('id-ID')}${warning}${auditTag}`
      );
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Network error — cek koneksi internet');
      setLoading(false);
    }
  };

  const adTitle = ad.title ?? '(no title)';

  // Format price input dengan thousand separator (saat user ketik)
  const handlePriceChange = (val: string) => {
    const digits = val.replace(/[^\d]/g, '');
    if (digits === '') {
      setPricePaid('');
      return;
    }
    const num = Number(digits);
    setPricePaid(num.toLocaleString('id-ID'));
  };

  const priceNumeric = Number(pricePaid.replace(/[^\d]/g, '')) || 0;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-status-healthy/12 text-status-healthy shrink-0">
              <Wallet size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-text leading-tight">
                Catat Pembayaran
              </h2>
              <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                <span className="font-semibold text-text">{adTitle}</span>
                {' · '}
                {ad.advertiser_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-text-muted hover:text-text p-1 rounded-md hover:bg-surface-muted transition-colors shrink-0 disabled:opacity-50"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Price Paid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Harga Final Disetujui <span className="text-status-critical">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[13px] font-semibold pointer-events-none">
                Rp
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={pricePaid}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="2.500.000"
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 text-[14px] font-semibold text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50 tabular-nums"
              />
            </div>
            {priceNumeric > 0 && (
              <p className="text-[10px] text-text-muted mt-1">
                Rp {priceNumeric.toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Paid At */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              <Calendar size={11} className="inline -mt-0.5 mr-1" />
              Tanggal Pembayaran <span className="text-status-critical">*</span>
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              max={todayISO()}
              disabled={loading}
              className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Metode Pembayaran <span className="text-status-critical">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  disabled={loading}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-3 rounded-lg border-2 transition-all',
                    method === value
                      ? 'border-status-healthy bg-status-healthy/8 text-status-healthy'
                      : 'border-border bg-surface-muted text-text-muted hover:border-text-muted hover:text-text',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon size={16} />
                  <span className="text-[10px] font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bank Account Dropdown (conditional: transfer only) */}
          {method === 'transfer' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                <Building2 size={11} className="inline -mt-0.5 mr-1" />
                Rekening Penerima <span className="text-status-critical">*</span>
              </label>
              {banksLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-muted border border-border rounded-lg">
                  <Loader2 size={14} className="animate-spin text-text-muted" />
                  <span className="text-[12px] text-text-muted">Memuat rekening...</span>
                </div>
              ) : banks.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
                  <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
                  <p className="text-[11px] text-status-critical leading-relaxed">
                    Belum ada rekening aktif. Tambahkan di tab Bank Accounts dulu.
                  </p>
                </div>
              ) : (
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} {b.account_number} — {b.account_holder_alias}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Payment Proof URL */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              <Link2 size={11} className="inline -mt-0.5 mr-1" />
              Bukti Transfer (URL)
              {!auditPending && <span className="text-status-critical ml-0.5">*</span>}
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://... atau paste URL screenshot WA"
              disabled={loading || auditPending}
              className={cn(
                'w-full px-3 py-2.5 text-[12px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60',
                (loading || auditPending) && 'opacity-50 cursor-not-allowed'
              )}
            />
            <p className="text-[10px] text-text-muted mt-1.5">
              Tip: upload screenshot WA dulu ke Drive/imgur, paste URL-nya di sini.
            </p>

            {/* Audit pending checkbox */}
            <label className="flex items-start gap-2 mt-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={auditPending}
                onChange={(e) => setAuditPending(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-border accent-status-warning"
              />
              <div className="flex-1">
                <span className="text-[12px] font-semibold text-text group-hover:text-status-warning transition-colors">
                  <MessageSquareWarning size={11} className="inline -mt-0.5 mr-1" />
                  Bukti masih di WA, upload nanti
                </span>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Akan ditandai <strong>audit pending</strong> — wajib upload dalam 7 hari.
                </p>
              </div>
            </label>
          </div>

          {/* Notes (opsional) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Invoice INV-2026/05/123, atau context lain"
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 text-[12px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
              <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
              <p className="text-[11px] text-status-critical leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/8 border border-status-info/20">
            <AlertTriangle size={13} className="text-status-info shrink-0 mt-0.5" />
            <p className="text-[10px] text-status-info leading-relaxed">
              Pembayaran tercatat → status iklan tetap (admin pakai action terpisah untuk activate).
              Revenue masuk ke <strong>Dashboard Financial</strong>.
            </p>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[12px] font-bold text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || priceNumeric === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-all',
              'bg-status-healthy text-white hover:bg-status-healthy/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Wallet size={13} />
                Catat Pembayaran
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
