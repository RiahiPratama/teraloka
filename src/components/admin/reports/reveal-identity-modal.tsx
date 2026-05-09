'use client';

/**
 * TeraLoka — RevealIdentityModal
 * Sub-Sprint 1C-C-13 Phase 4 (9 Mei 2026)
 * ------------------------------------------------------------
 * Modal forensic reveal pelapor identity (super_admin only).
 *
 * Flow:
 *   1. FORM phase: warning + reason textarea + cancel/confirm buttons
 *   2. SUBMIT: POST /admin/balapor/reporter/:id/identity { reason }
 *   3. SUCCESS phase: reveal full identity (phone, name, IP, UA, device)
 *      + audit log mention + close button
 *
 * Privacy-critical:
 *   - reason WAJIB minimal 5 karakter (backend validation parity)
 *   - audit log auto-insert (access_type='forensic_reveal')
 *   - close trigger drawer refresh (audit_history update)
 *
 * Pattern reference: reject-report-modal.tsx (Sub-Sprint 1C-C-9)
 */

import { useEffect, useState } from 'react';
import {
  Eye,
  X,
  Shield,
  Phone,
  User,
  Globe,
  Smartphone,
  Calendar,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ApiError, useApi } from '@/lib/api/client';
import {
  type ReporterFullIdentity,
  getAnonymityLabel,
  getAnonymityIcon,
} from '@/types/reporters';

export interface RevealIdentityModalProps {
  /** Reporter target (modal visible kalau != null) */
  reporter: { id: string; name_display: string | null; phone_masked: string | null } | null;
  /** Callback close modal — caller refresh detail drawer */
  onClose: () => void;
  /** Callback success — trigger drawer audit_history refresh */
  onSuccess: () => void;
  /** Toast helper */
  onToast: (message: string, ok: boolean) => void;
}

type ModalPhase = 'form' | 'success';

export function RevealIdentityModal({
  reporter,
  onClose,
  onSuccess,
  onToast,
}: RevealIdentityModalProps) {
  const api = useApi();

  const [phase, setPhase] = useState<ModalPhase>('form');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<ReporterFullIdentity | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  /* ── Reset state saat modal opened ── */
  useEffect(() => {
    if (reporter) {
      setPhase('form');
      setReason('');
      setSubmitting(false);
      setError(null);
      setRevealed(null);
      setCopiedField(null);
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
      const data = await api.post<ReporterFullIdentity>(
        `/admin/balapor/reporter/${reporter.id}/identity`,
        { reason: reason.trim() },
      );
      setRevealed(data);
      setPhase('success');
      onToast('Identitas berhasil di-reveal · Audit log tercatat', true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        onToast(err.message, false);
      } else {
        setError('Gagal reveal identitas');
        onToast('Gagal reveal identitas', false);
      }
      setSubmitting(false);
    }
  }

  /* ── Close handler — trigger refresh kalau success ── */
  function handleClose() {
    if (phase === 'success') {
      onSuccess();   // Trigger drawer audit_history refresh
    }
    onClose();
  }

  /* ── Copy to clipboard ── */
  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      onToast('Gagal copy', false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-modal-title"
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-status-critical/8">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-status-critical/15 flex items-center justify-center shrink-0">
              <Eye size={20} className="text-status-critical" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="reveal-modal-title" className="text-base font-bold text-text">
                Reveal Identitas Pelapor
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
              {/* Warning Box — privacy-critical */}
              <div className="bg-status-critical/8 border-2 border-status-critical/30 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Shield size={16} className="text-status-critical shrink-0 mt-0.5" />
                  <h3 className="text-xs font-bold text-status-critical uppercase tracking-wider">
                    Aksi Privasi-Sensitif
                  </h3>
                </div>
                <ul className="text-[11px] text-text leading-relaxed space-y-1 ml-6">
                  <li>• Akan reveal: nomor HP penuh, nama, IP address, User-Agent, device</li>
                  <li>• Audit log otomatis tercatat (siapa + kapan + alasan)</li>
                  <li>• Audit ini permanent — tidak bisa dihapus</li>
                  <li>• Pakai HANYA untuk investigasi sah (fraud, abuse, legal)</li>
                </ul>
              </div>

              {/* Reason textarea */}
              <div>
                <label
                  htmlFor="reveal-reason"
                  className="text-xs font-bold text-text uppercase tracking-wider mb-2 block"
                >
                  Alasan Reveal <span className="text-status-critical">*</span>
                  <span className="ml-2 text-text-muted font-normal normal-case tracking-normal">
                    (min 5 karakter)
                  </span>
                </label>
                <textarea
                  id="reveal-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Contoh: Investigasi dugaan spam laporan BL-2026-0083, perlu cross-check IP"
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border border-border bg-surface',
                    'text-sm text-text placeholder:text-text-subtle',
                    'focus:outline-none focus:ring-2 focus:ring-status-critical/30 focus:border-status-critical',
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

          {phase === 'success' && revealed && (
            <>
              {/* Success header */}
              <div className="bg-status-healthy/8 border border-status-healthy/30 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-status-healthy shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-status-healthy">
                    Identitas Berhasil Di-Reveal
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Audit log tercatat · {new Date(revealed.accessed_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Identity section */}
              <RevealField
                icon={<User size={14} />}
                label="Nama"
                value={revealed.name || '—'}
                copyable={Boolean(revealed.name)}
                copied={copiedField === 'name'}
                onCopy={() => revealed.name && copyToClipboard(revealed.name, 'name')}
              />

              <RevealField
                icon={<Phone size={14} />}
                label="Nomor Telepon"
                value={revealed.phone || '—'}
                copyable={Boolean(revealed.phone)}
                copied={copiedField === 'phone'}
                onCopy={() => revealed.phone && copyToClipboard(revealed.phone, 'phone')}
              />

              <RevealField
                icon={<span aria-hidden="true">{getAnonymityIcon(revealed.anonymity_level_dominant)}</span>}
                label="Anonimitas Dominan"
                value={getAnonymityLabel(revealed.anonymity_level_dominant)}
              />

              {revealed.pseudonym_dominant && (
                <RevealField
                  icon={<User size={14} />}
                  label="Pernah Pakai Pseudonim"
                  value={`"${revealed.pseudonym_dominant}"`}
                />
              )}

              {revealed.joined_at && (
                <RevealField
                  icon={<Calendar size={14} />}
                  label="Bergabung"
                  value={new Date(revealed.joined_at).toLocaleString('id-ID')}
                />
              )}

              {/* Forensic section */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                  Forensic Data (laporan terbaru)
                </h4>

                <RevealField
                  icon={<Globe size={14} />}
                  label="Latest IP"
                  value={revealed.latest_ip || '—'}
                  copyable={Boolean(revealed.latest_ip)}
                  copied={copiedField === 'ip'}
                  onCopy={() => revealed.latest_ip && copyToClipboard(revealed.latest_ip, 'ip')}
                  mono
                />

                <RevealField
                  icon={<Smartphone size={14} />}
                  label="Latest Device"
                  value={revealed.latest_device || '—'}
                />

                {revealed.latest_user_agent && (
                  <RevealField
                    icon={<Globe size={14} />}
                    label="Latest User Agent"
                    value={revealed.latest_user_agent}
                    mono
                    small
                  />
                )}

                {revealed.distinct_ips.length > 1 && (
                  <div className="bg-status-warning/8 border border-status-warning/20 rounded-lg p-3">
                    <p className="text-[11px] font-bold text-status-warning mb-1.5">
                      ⚠️ {revealed.distinct_ips.length} distinct IPs detected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {revealed.distinct_ips.map((ip) => (
                        <span
                          key={ip}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border"
                        >
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                    Reveal…
                  </span>
                ) : (
                  'Reveal Identitas'
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

/* ════════════════════════════════════════════════════════════════
   Sub-component: RevealField (single field display)
   ════════════════════════════════════════════════════════════════ */

interface RevealFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  mono?: boolean;
  small?: boolean;
}

function RevealField({
  icon,
  label,
  value,
  copyable = false,
  copied = false,
  onCopy,
  mono = false,
  small = false,
}: RevealFieldProps) {
  return (
    <div className="bg-surface-muted/40 border border-border rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-text-muted shrink-0">{icon}</span>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'text-text break-all',
            mono && 'font-mono',
            small ? 'text-[11px]' : 'text-sm',
            'flex-1',
          )}
        >
          {value}
        </p>
        {copyable && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              'shrink-0 h-6 w-6 rounded flex items-center justify-center transition-colors',
              copied
                ? 'bg-status-healthy/15 text-status-healthy'
                : 'text-text-muted hover:text-text hover:bg-surface-muted',
            )}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
