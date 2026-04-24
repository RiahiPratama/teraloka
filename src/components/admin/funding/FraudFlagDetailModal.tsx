'use client';

import { useContext, useState, useEffect } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import type { FraudFlag } from './FraudFlagsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Shield: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Check:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Flag:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
};

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (num >= 1_000) return 'Rp ' + (num / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (key.includes('amount') || key.includes('target')) return formatRupiah(value);
    if (key === 'similarity' || key === 'proportion') return `${Math.round(value * 100)}%`;
    if (key === 'multiplier') return `${value}x`;
    return String(value);
  }
  if (Array.isArray(value)) return value.length > 3 ? `${value.length} items` : value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; accent: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)', text: '#DC2626', accent: '#EF4444', label: 'CRITICAL' },
  high:     { bg: 'rgba(249,115,22,0.12)', text: '#EA580C', accent: '#F97316', label: 'HIGH' },
  medium:   { bg: 'rgba(245,158,11,0.12)', text: '#D97706', accent: '#F59E0B', label: 'MEDIUM' },
  low:      { bg: 'rgba(59,130,246,0.12)', text: '#2563EB', accent: '#3B82F6', label: 'LOW' },
};

// ═══════════════════════════════════════════════════════════════
// FRAUD FLAG DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

type ActionMode = 'view' | 'resolve';
type Resolution = 'false_positive' | 'confirmed' | 'escalated';

export default function FraudFlagDetailModal({
  open,
  flagId,
  initialMode,
  onClose,
  onSuccess,
  onToast,
}: {
  open: boolean;
  flagId: string | null;
  initialMode: ActionMode;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  const [flag, setFlag] = useState<FraudFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ActionMode>('view');
  const [submitting, setSubmitting] = useState(false);

  // Resolve form state
  const [resolution, setResolution] = useState<Resolution>('false_positive');
  const [notes, setNotes] = useState('');

  // Load flag detail when modal opens
  useEffect(() => {
    if (!open || !flagId) return;

    setMode(initialMode);
    setResolution('false_positive');
    setNotes('');
    setFlag(null);
    setLoading(true);

    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); setLoading(false); return; }

    fetch(`${API_URL}/fraud/admin/flags/${flagId}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setFlag(json.data);
        else onToast(false, json?.error?.message ?? 'Gagal load flag');
      })
      .catch(err => onToast(false, err.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [open, flagId, initialMode, onToast]);

  if (!open) return null;

  async function handleResolve() {
    if (!flag) return;
    if (notes.trim().length < 10) {
      onToast(false, 'Notes resolusi minimal 10 karakter');
      return;
    }

    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/fraud/admin/flags/${flag.id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes: notes.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal resolve');

      const labels: Record<Resolution, string> = {
        false_positive: 'ditandai false positive',
        confirmed: 'dikonfirmasi sebagai fraud',
        escalated: 'di-escalate untuk investigasi',
      };
      onToast(true, `✓ Flag ${labels[resolution]}`);
      onClose();
      onSuccess();
    } catch (err: any) {
      onToast(false, err.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  const sev = flag ? SEVERITY_STYLE[flag.severity] ?? SEVERITY_STYLE.low : SEVERITY_STYLE.low;
  const isActive = flag?.status === 'active';

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(4px)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.mainBg, borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 720, margin: '32px 0', maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          borderTop: flag ? `4px solid ${sev.accent}` : undefined,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: flag ? sev.bg : t.navHover,
              color: flag ? sev.text : t.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Shield />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                🛡️ Fraud Flag Detail
              </h3>
              <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                {flag ? `${flag.signal_code}${flag.status === 'resolved' ? ' · Resolved' : ''}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent', border: 'none', color: t.textDim,
              cursor: submitting ? 'not-allowed' : 'pointer', padding: 4,
            }}
          >
            <Icons.X />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
              Memuat detail flag...
            </div>
          ) : !flag ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
              Flag tidak ditemukan
            </div>
          ) : (
            <>
              {/* Signal Banner */}
              <div style={{
                background: sev.bg,
                border: `1px solid ${sev.accent}55`,
                borderRadius: 12, padding: 16, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: sev.text,
                    padding: '3px 10px', background: '#fff',
                    borderRadius: 999, letterSpacing: '0.05em',
                  }}>
                    {sev.label}
                  </span>
                  <span style={{ fontSize: 11, color: sev.text, fontFamily: 'monospace', fontWeight: 700 }}>
                    {flag.signal_code}
                  </span>
                  <span style={{ fontSize: 11, color: sev.text }}>
                    · Confidence {Math.round(flag.confidence * 100)}%
                  </span>
                </div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: sev.text, marginBottom: 6 }}>
                  {flag.label ?? flag.signal_code}
                </h4>
                <p style={{ fontSize: 12, color: sev.text, lineHeight: 1.5, opacity: 0.85 }}>
                  {flag.description}
                </p>
              </div>

              {/* Target Context */}
              {flag.campaign && (
                <TargetBox
                  t={t}
                  icon="🎯"
                  title="Kampanye"
                  primary={flag.campaign.title}
                  meta={[
                    flag.campaign.partner_name ? `Partner: ${flag.campaign.partner_name}` : null,
                    flag.campaign.collected_amount !== undefined ? `Terkumpul: ${shortRupiah(flag.campaign.collected_amount)}` : null,
                    flag.campaign.status ? `Status: ${flag.campaign.status}` : null,
                  ].filter(Boolean) as string[]}
                  linkHref={flag.campaign.slug ? `/donasi/${flag.campaign.slug}` : undefined}
                />
              )}

              {flag.donation && (
                <TargetBox
                  t={t}
                  icon="💰"
                  title="Donasi"
                  primary={`${shortRupiah(flag.donation.amount)} · ${flag.donation.donor_name ?? 'Anonim'}`}
                  meta={[
                    flag.donation.donation_code ? `Code: ${flag.donation.donation_code}` : null,
                    flag.donation.verification_status ? `Status: ${flag.donation.verification_status}` : null,
                  ].filter(Boolean) as string[]}
                />
              )}

              {/* Details Table */}
              <div style={{ marginBottom: 16 }}>
                <p style={sectionLabelStyle(t)}>
                  🔍 Detail Teknis
                </p>
                <div style={{
                  border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {Object.entries(flag.details || {}).map(([key, value], i) => (
                        <tr key={key} style={{ borderTop: i > 0 ? `1px solid ${t.sidebarBorder}` : 'none' }}>
                          <td style={{
                            padding: '8px 12px', width: '40%',
                            background: t.navHover + '33',
                            color: t.textDim, fontSize: 11, fontWeight: 600,
                          }}>
                            {formatKey(key)}
                          </td>
                          <td style={{ padding: '8px 12px', color: t.textPrimary, fontSize: 12, fontWeight: 500 }}>
                            {formatValue(key, value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggested Action */}
              {flag.suggested_action && (
                <div style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 12, padding: 12, marginBottom: 16,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{ color: '#6366F1', flexShrink: 0, marginTop: 2 }}>
                    <Icons.Alert />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      Tindakan Disarankan
                    </p>
                    <p style={{ fontSize: 12, color: t.textPrimary, lineHeight: 1.5 }}>
                      {flag.suggested_action}
                    </p>
                  </div>
                </div>
              )}

              {/* Resolution Info (if already resolved) */}
              {!isActive && flag.resolution && (
                <div style={{
                  background: t.navHover,
                  border: `1px solid ${t.sidebarBorder}`,
                  borderRadius: 12, padding: 12, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Resolusi Admin
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>
                    {getResolutionLabel(flag.resolution)}
                  </p>
                  {flag.resolution_notes && (
                    <p style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5, fontStyle: 'italic' }}>
                      "{flag.resolution_notes}"
                    </p>
                  )}
                  {flag.resolved_at && (
                    <p style={{ fontSize: 10, color: t.textMuted, marginTop: 6 }}>
                      Resolved {new Date(flag.resolved_at).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              )}

              {/* Resolve Form (only in resolve mode) */}
              {mode === 'resolve' && isActive && (
                <div style={{
                  border: `2px solid ${sev.accent}`,
                  background: sev.bg,
                  borderRadius: 12, padding: 16, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: sev.text, marginBottom: 12 }}>
                    Pilih resolusi:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {(['false_positive', 'confirmed', 'escalated'] as const).map(opt => (
                      <label
                        key={opt}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: resolution === opt ? t.mainBg : 'transparent',
                          border: `2px solid ${resolution === opt ? sev.accent : 'transparent'}`,
                          cursor: 'pointer',
                          transition: 'all 100ms',
                        }}
                      >
                        <input
                          type="radio"
                          checked={resolution === opt}
                          onChange={() => setResolution(opt)}
                          disabled={submitting}
                          style={{ marginTop: 2, accentColor: sev.accent }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
                            {getResolutionLabel(opt)}
                          </p>
                          <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.4 }}>
                            {getResolutionHelp(opt)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <label style={{ display: 'block' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: sev.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Notes <span style={{ opacity: 0.7 }}>(min 10 karakter)</span>
                    </p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Jelaskan alasan resolusi ini (penting untuk audit trail)..."
                      maxLength={500}
                      disabled={submitting}
                      style={{
                        width: '100%', padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${t.sidebarBorder}`,
                        background: t.mainBg, color: t.textPrimary,
                        fontSize: 13, outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'inherit', resize: 'none',
                      }}
                    />
                    <p style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'right' }}>
                      {notes.length}/500
                    </p>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {flag && (
          <div style={{
            padding: '14px 24px',
            borderTop: `1px solid ${t.sidebarBorder}`,
            display: 'flex', gap: 12,
            background: t.navHover + '33',
          }}>
            {mode === 'view' && (
              <>
                <button onClick={onClose} disabled={submitting} style={btnSecondaryStyle(t, submitting)}>
                  Tutup
                </button>
                {isActive && (
                  <button
                    onClick={() => setMode('resolve')}
                    disabled={submitting}
                    style={btnPrimaryStyle(submitting, true, sev.accent)}
                  >
                    <Icons.Flag /> <span>Resolve Flag</span>
                  </button>
                )}
              </>
            )}

            {mode === 'resolve' && isActive && (
              <>
                <button onClick={() => setMode('view')} disabled={submitting} style={btnSecondaryStyle(t, submitting)}>
                  Kembali
                </button>
                <button
                  onClick={handleResolve}
                  disabled={notes.trim().length < 10 || submitting}
                  style={btnPrimaryStyle(submitting || notes.trim().length < 10, notes.trim().length >= 10, sev.accent)}
                >
                  {submitting ? 'Menyimpan...' : '✓ Submit Resolution'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────

function TargetBox({
  t, icon, title, primary, meta, linkHref,
}: {
  t: any; icon: string; title: string; primary: string; meta: string[]; linkHref?: string;
}) {
  return (
    <div style={{
      background: t.navHover + '55',
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 10, padding: 12, marginBottom: 16,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {icon} {title}
      </p>
      <p style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary, marginBottom: 6 }}>
        {primary}
      </p>
      {meta.length > 0 && (
        <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5 }}>
          {meta.join(' · ')}
        </p>
      )}
      {linkHref && (
        <a
          href={linkHref}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 11, color: '#EC4899', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Lihat kampanye ↗
        </a>
      )}
    </div>
  );
}

// ── Helper labels ────────────────────────────────

function getResolutionLabel(r: Resolution | string): string {
  const map: Record<string, string> = {
    false_positive: '❎ False Positive',
    confirmed:      '⚠️ Confirmed (Fraud terdeteksi)',
    escalated:      '🚨 Escalated (Perlu investigasi lanjut)',
  };
  return map[r] ?? r;
}

function getResolutionHelp(r: Resolution): string {
  const map: Record<Resolution, string> = {
    false_positive: 'Admin sudah verifikasi bahwa flag ini bukan fraud. Kampanye/donasi aman.',
    confirmed:      'Admin konfirmasi fraud. Consider action: reject campaign, freeze account, dsb.',
    escalated:      'Flag butuh review lebih dalam. Pause aktivitas sementara + dokumentasikan temuan.',
  };
  return map[r];
}

// ── Style helpers ────────────────────────────────

function sectionLabelStyle(t: any): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  };
}

function btnSecondaryStyle(t: any, disabled: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '12px 16px', borderRadius: 12,
    border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
    color: t.textPrimary, fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function btnPrimaryStyle(disabled: boolean, enabled: boolean, accent: string): React.CSSProperties {
  return {
    flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
    background: enabled && !disabled ? accent : '#9CA3AF',
    color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: enabled && !disabled ? 'pointer' : 'not-allowed',
    opacity: enabled && !disabled ? 1 : 0.6,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: enabled && !disabled ? `0 4px 12px ${accent}44` : 'none',
  };
}
