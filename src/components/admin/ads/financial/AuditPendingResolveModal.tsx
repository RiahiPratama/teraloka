'use client';

/**
 * TeraLoka — AuditPendingResolveModal
 * SESI 5G BATCH 2.B (20 Mei 2026) — Phase 3 Audit Pending Action UI
 * ------------------------------------------------------------
 * Modal untuk upload bukti pembayaran retroactive
 * (resolve ad yang sebelumnya di-record dengan audit_pending=true).
 *
 * Features:
 *   - Display ad info (display_id, advertiser, amount, tercatat at) READ-ONLY
 *   - Field: payment_proof_url (URL bukti, REQUIRED, validate http/https)
 *   - Field: notes (textarea opsional)
 *   - Escape key + click backdrop untuk cancel
 *   - Loading state saat submit
 *   - Inline validation error
 *
 * Pattern mirror PaymentRecordModal (Tailwind v4 utility).
 *
 * Backend endpoint: PATCH /admin/ads/:id/resolve-audit-pending
 *
 * Lifecycle:
 *   - Mount: focus URL input
 *   - Submit success → onSuccess(message) callback → parent close + refresh
 *   - Submit error → setError inline
 *   - Close X / Escape / backdrop click → onClose (kalau gak loading)
 */

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, X, AlertTriangle, Loader2, Link2, MessageSquareWarning, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types ───────────────────────────────────────────────────────

/**
 * Subset dari FinancialEvent yang dibutuhkan modal.
 * Lebih simple dari full AdRow karena resolve hanya butuh display info.
 */
export interface AuditPendingEventForModal {
  id:               string;             // event_id (untuk reference)
  source_entity_id: string;             // ad_id
  amount:           number;
  recorded_at:      string;
  metadata: {
    ad_display_id?:      string;
    advertiser_name?:    string;
    bank_account_alias?: string;
    [key: string]: any;
  };
}

interface ResolveResponse {
  success: boolean;
  data?: {
    ad_id:             string;
    resolved_at:       string;
    money_emitted:     boolean;
    previous_event_id: string | null;
  };
  error?: { code: string; message: string };
}

export interface AuditPendingResolveModalProps {
  event:     AuditPendingEventForModal | null;
  token:     string | null;
  onSuccess: (msg: string) => void;
  onError:   (msg: string) => void;
  onClose:   () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────

const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// ─── Component ───────────────────────────────────────────────────

export default function AuditPendingResolveModal({
  event,
  token,
  onSuccess,
  onError,
  onClose,
}: AuditPendingResolveModalProps) {
  const [proofUrl, setProofUrl] = useState<string>('');
  const [notes, setNotes]       = useState<string>('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState<boolean>(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  // ─── Effects ─────────────────────────────────────────────────

  // Reset state saat modal close/reopen
  useEffect(() => {
    if (!event) {
      setProofUrl('');
      setNotes('');
      setError(null);
      setLoading(false);
    }
  }, [event]);

  // Focus URL input on open
  useEffect(() => {
    if (event && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [event]);

  // Escape key handler
  useEffect(() => {
    if (!event) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [event, loading, onClose]);

  if (!event) return null;

  // ─── Submit handler ──────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);

    // Validation
    const url = proofUrl.trim();
    if (!url) {
      setError('URL bukti pembayaran wajib diisi');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setError('URL harus dimulai dengan http:// atau https://');
      return;
    }

    if (!token) {
      setError('Session expired, login ulang');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API}/admin/ads/${event.source_entity_id}/resolve-audit-pending`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payment_proof_url: url,
            notes:             notes.trim() || null,
          }),
        }
      );
      const json: ResolveResponse = await res.json();

      if (!json.success || !json.data) {
        const msg = json.error?.message ?? 'Gagal resolve audit pending';
        setError(msg);
        setLoading(false);
        return;
      }

      const displayId = event.metadata.ad_display_id ?? event.source_entity_id.slice(0, 8);
      onSuccess(`✓ Bukti tercatat untuk ${displayId} — audit clean`);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Network error — cek koneksi internet');
      setLoading(false);
    }
  };

  const displayId      = event.metadata.ad_display_id ?? '—';
  const advertiserName = event.metadata.advertiser_name ?? '—';
  const bankAlias      = event.metadata.bank_account_alias;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-status-healthy/12 text-status-healthy shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-text leading-tight">
                Resolve Audit Pending
              </h2>
              <p className="text-[11px] text-text-muted mt-1">
                Upload bukti untuk tutup audit loop
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

          {/* Ad info card (read only) */}
          <div className="bg-status-warning/8 border border-status-warning/30 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-status-warning tabular-nums">
                {displayId}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-status-warning/20 text-status-warning">
                <AlertTriangle size={9} />
                Pending
              </span>
            </div>
            <div className="text-[12px] font-semibold text-text">
              {advertiserName}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-status-warning/20">
              <span className="text-[10px] text-text-muted">Amount</span>
              <span className="text-[13px] font-extrabold text-text tabular-nums">
                {formatRp(event.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-text-muted">
                <Clock size={9} className="inline mr-1" />
                Tercatat
              </span>
              <span className="text-[10px] text-text">
                {formatDate(event.recorded_at)} {formatTime(event.recorded_at)}
              </span>
            </div>
            {bankAlias && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-text-muted">Bank</span>
                <span className="text-[10px] text-text">{bankAlias}</span>
              </div>
            )}
          </div>

          {/* URL Bukti — REQUIRED */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              <Link2 size={11} className="inline -mt-0.5 mr-1" />
              URL Bukti Pembayaran <span className="text-status-critical">*</span>
            </label>
            <input
              ref={inputRef}
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Tip: paste URL screenshot transfer dari WA ke Drive / Imgur, lalu copy share link
            </p>
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              <MessageSquareWarning size={11} className="inline -mt-0.5 mr-1" />
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Bukti diterima dari klien via WhatsApp, screenshot sudah disimpan di Drive"
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2.5 text-[12px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-healthy/30 focus:border-status-healthy/60 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
              <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
              <p className="text-[11px] text-status-critical leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !proofUrl.trim()}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-extrabold uppercase tracking-wide transition-all',
              loading || !proofUrl.trim()
                ? 'bg-surface-muted text-text-muted cursor-not-allowed'
                : 'bg-status-healthy text-white hover:bg-status-healthy/90'
            )}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Resolve Audit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
