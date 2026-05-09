'use client';

/**
 * TeraLoka — ContactReporterModal
 * Sub-Sprint 1C-C-13 Phase 4 (9 Mei 2026)
 * ------------------------------------------------------------
 * Modal log WA contact action ke pelapor (super_admin only).
 *
 * Filosofi (Pilihan A architecture): WA contact gated like identity reveal.
 *   - Phone reveal only after admin commit reason
 *   - Audit log auto-insert (access_type='contact_wa')
 *   - WA action transparent + accountable
 *
 * Flow:
 *   1. FORM phase: info box + reason textarea + cancel/confirm
 *   2. SUBMIT: POST /admin/balapor/reporter/:id/contact { reason }
 *   3. SUCCESS phase: phone displayed + Buka WhatsApp button + Copy phone
 *
 * Pattern reference: reject-report-modal.tsx + reveal-identity-modal.tsx
 */

import { useEffect, useState } from 'react';
import {
  MessageCircle,
  X,
  Phone,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ApiError, useApi } from '@/lib/api/client';
import { type ContactReporterResult } from '@/types/reporters';

export interface ContactReporterModalProps {
  /** Reporter target (modal visible kalau != null) */
  reporter: { id: string; name_display: string | null; phone_masked: string | null } | null;
  /** Callback close modal */
  onClose: () => void;
  /** Callback success — trigger drawer audit_history refresh */
  onSuccess: () => void;
  /** Toast helper */
  onToast: (message: string, ok: boolean) => void;
}

type ModalPhase = 'form' | 'success';

export function ContactReporterModal({
  reporter,
  onClose,
  onSuccess,
  onToast,
}: ContactReporterModalProps) {
  const api = useApi();

  const [phase, setPhase] = useState<ModalPhase>('form');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactData, setContactData] = useState<ContactReporterResult | null>(null);
  const [copied, setCopied] = useState(false);

  /* ── Reset state saat modal opened ── */
  useEffect(() => {
    if (reporter) {
      setPhase('form');
      setReason('');
      setSubmitting(false);
      setError(null);
      setContactData(null);
      setCopied(false);
    }
  }, [reporter]);

  /* ── ESC key close ── */
  useEffect(() => {
    if (!reporter) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reporter, submitting]);

  if (!reporter) return null;

  const isValid = reason.trim().length >= 5;
  const charsRemaining = Math.max(0, 5 - reason.trim().length);

  /* ── Submit handler ── */
  async function handleSubmit() {
    if (!isValid || !reporter) return;
    setSubmitting(true);
    setError(null);

    try {
      const data = await api.post<ContactReporterResult>(
        `/admin/balapor/reporter/${reporter.id}/contact`,
        { reason: reason.trim() },
      );
      setContactData(data);
      setPhase('success');
      onToast('Kontak tercatat · Audit log saved', true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        onToast(err.message, false);
      } else {
        setError('Gagal log contact action');
        onToast('Gagal log contact action', false);
      }
      setSubmitting(false);
    }
  }

  /* ── Close handler — trigger refresh kalau success ── */
  function handleClose() {
    if (phase === 'success') {
      onSuccess();
    }
    onClose();
  }

  /* ── Copy phone ── */
  async function copyPhone() {
    if (!contactData) return;
    try {
      await navigator.clipboard.writeText(contactData.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Gagal copy', false);
    }
  }

  /* ── Buka WhatsApp ── */
  function openWhatsApp() {
    if (!contactData) return;
    window.open(contactData.wa_url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-balapor/8">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-balapor/15 flex items-center justify-center shrink-0">
              <MessageCircle size={20} className="text-balapor" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="contact-modal-title" className="text-base font-bold text-text">
                Kontak Pelapor via WhatsApp
              </h2>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {reporter.name_display || 'Pelapor'} · {reporter.phone_masked || '****'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-text-muted hover:text-text transition-colors p-1 rounded-md hover:bg-surface-muted disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {phase === 'form' && (
            <>
              {/* Info Box */}
              <div className="bg-balapor/8 border border-balapor/30 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info size={16} className="text-balapor shrink-0 mt-0.5" />
                  <h3 className="text-xs font-bold text-balapor uppercase tracking-wider">
                    Aksi Privasi Tercatat
                  </h3>
                </div>
                <ul className="text-[11px] text-text leading-relaxed space-y-1 ml-6">
                  <li>• Audit log otomatis tercatat (siapa + kapan + alasan)</li>
                  <li>• Nomor HP akan ditampilkan untuk klik WA</li>
                  <li>• Pakai untuk verifikasi tindak lanjut atau klarifikasi laporan</li>
                  <li>• Jangan untuk komunikasi pribadi non-platform</li>
                </ul>
              </div>

              {/* Reason textarea */}
              <div>
                <label
                  htmlFor="contact-reason"
                  className="text-xs font-bold text-text uppercase tracking-wider mb-2 block"
                >
                  Alasan Kontak <span className="text-balapor">*</span>
                  <span className="ml-2 text-text-muted font-normal normal-case tracking-normal">
                    (min 5 karakter)
                  </span>
                </label>
                <textarea
                  id="contact-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Contoh: Verifikasi tindak lanjut laporan BL-2026-0036 — minta foto situasi terkini"
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border border-border bg-surface',
                    'text-sm text-text placeholder:text-text-subtle',
                    'focus:outline-none focus:ring-2 focus:ring-balapor/30 focus:border-balapor',
                    'disabled:opacity-50 resize-none',
                  )}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={cn(
                      'text-[11px]',
                      isValid ? 'text-status-healthy' : 'text-text-muted',
                    )}
                  >
                    {isValid ? '✓ Cukup' : `${charsRemaining} karakter lagi`}
                  </span>
                  <span className="text-[11px] text-text-muted tabular-nums">
                    {reason.length} karakter
                  </span>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="bg-status-critical/8 border border-status-critical/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
                  <p className="text-xs text-status-critical leading-relaxed">{error}</p>
                </div>
              )}
            </>
          )}

          {phase === 'success' && contactData && (
            <>
              {/* Success header */}
              <div className="bg-status-healthy/8 border border-status-healthy/30 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-status-healthy shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-status-healthy">
                    Kontak Tercatat di Audit Log
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {new Date(contactData.accessed_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Phone display */}
              <div className="bg-surface-muted/40 border border-border rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Phone size={14} className="text-text-muted" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Nomor WhatsApp
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-base font-bold text-text break-all">
                    {contactData.phone}
                  </p>
                  <button
                    type="button"
                    onClick={copyPhone}
                    className={cn(
                      'shrink-0 h-7 w-7 rounded flex items-center justify-center transition-colors',
                      copied
                        ? 'bg-status-healthy/15 text-status-healthy'
                        : 'text-text-muted hover:text-text hover:bg-surface-muted',
                    )}
                    title={copied ? 'Copied!' : 'Copy nomor'}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* CTA: Buka WhatsApp */}
              <button
                type="button"
                onClick={openWhatsApp}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                  'bg-balapor text-white font-bold text-sm',
                  'hover:bg-balapor/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
                )}
              >
                <MessageCircle size={16} />
                Buka WhatsApp
                <ExternalLink size={12} />
              </button>

              {/* Reminder */}
              <div className="bg-status-warning/8 border border-status-warning/20 rounded-lg p-3">
                <p className="text-[11px] text-text leading-relaxed">
                  <strong className="text-status-warning">Reminder:</strong> Komunikasi
                  WA harus profesional + relevan dengan laporan. Pelapor punya hak
                  laporkan abuse kalau pesan tidak relevan.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-border bg-surface-muted/30 flex items-center justify-end gap-2">
          {phase === 'form' && (
            <>
              <Button variant="secondary" size="sm" onClick={handleClose} disabled={submitting}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!isValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" />
                    Logging…
                  </span>
                ) : (
                  'Buka Nomor + Catat Audit'
                )}
              </Button>
            </>
          )}
          {phase === 'success' && (
            <Button variant="primary" size="sm" onClick={handleClose}>
              Tutup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
