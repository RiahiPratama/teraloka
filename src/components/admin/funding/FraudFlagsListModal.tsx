'use client';

import { useContext, useEffect, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import FraudFlagDetailModal from './FraudFlagDetailModal';
import type { FraudFlag } from './FraudFlagsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ChevRight: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Helpers ──────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  return `${Math.floor(days / 30)}bl lalu`;
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; accent: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.12)',  text: '#DC2626', accent: '#EF4444', label: 'CRITICAL' },
  high:     { bg: 'rgba(249,115,22,0.12)', text: '#EA580C', accent: '#F97316', label: 'HIGH' },
  medium:   { bg: 'rgba(245,158,11,0.12)', text: '#D97706', accent: '#F59E0B', label: 'MEDIUM' },
  low:      { bg: 'rgba(59,130,246,0.12)', text: '#2563EB', accent: '#3B82F6', label: 'LOW' },
};

// ═══════════════════════════════════════════════════════════════
// FRAUD FLAGS LIST MODAL
// Shows all flags for a target, each clickable to open detail
// ═══════════════════════════════════════════════════════════════

export default function FraudFlagsListModal({
  open,
  targetType,
  targetId,
  targetName,
  onClose,
  onFlagResolved,
}: {
  open: boolean;
  targetType: 'campaign' | 'donation' | 'user';
  targetId: string | null;
  targetName?: string;
  onClose: () => void;
  onFlagResolved?: () => void;
}) {
  const { t } = useContext(AdminThemeContext);

  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalId, setDetailModalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  // Fetch flags for this target
  useEffect(() => {
    if (!open || !targetId) return;

    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    setLoading(true);
    setFlags([]);

    fetch(`${API_URL}/fraud/admin/flags?target_id=${targetId}&limit=50`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setFlags(json.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [open, targetId]);

  if (!open) return null;

  const activeFlags = flags.filter(f => f.status === 'active');
  const resolvedFlags = flags.filter(f => f.status === 'resolved');

  // Summary
  const critical = activeFlags.filter(f => f.severity === 'critical').length;
  const high = activeFlags.filter(f => f.severity === 'high').length;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
          backdropFilter: 'blur(4px)', zIndex: 55,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: t.mainBg, borderRadius: 16,
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: 560, maxHeight: '80vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            borderTop: critical > 0 ? '4px solid #EF4444' : high > 0 ? '4px solid #F97316' : '4px solid #F59E0B',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${t.sidebarBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: critical > 0 ? 'rgba(239,68,68,0.12)' : high > 0 ? 'rgba(249,115,22,0.12)' : 'rgba(245,158,11,0.12)',
                color: critical > 0 ? '#DC2626' : high > 0 ? '#EA580C' : '#D97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icons.Shield />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
                  🛡️ {flags.length} Fraud Flag{flags.length > 1 ? 's' : ''}
                </h3>
                {targetName && (
                  <p style={{
                    fontSize: 11, color: t.textDim, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 380,
                  }}>
                    {targetType === 'campaign' ? '🎯' : targetType === 'donation' ? '💰' : '👤'} {targetName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: t.textDim,
                cursor: 'pointer', padding: 4,
              }}
            >
              <Icons.X />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
                Memuat flags...
              </div>
            ) : flags.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                  Tidak ada flag
                </p>
                <p style={{ fontSize: 11, color: t.textDim }}>
                  Target ini clean, tidak ada fraud signal terdeteksi.
                </p>
              </div>
            ) : (
              <>
                {/* Active Flags */}
                {activeFlags.length > 0 && (
                  <>
                    <p style={sectionLabelStyle(t, '#EF4444')}>
                      🔴 Active ({activeFlags.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {activeFlags.map(f => (
                        <FlagListItem
                          key={f.id}
                          flag={f}
                          t={t}
                          onClick={() => setDetailModalId(f.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Resolved Flags */}
                {resolvedFlags.length > 0 && (
                  <>
                    <p style={sectionLabelStyle(t, '#10B981')}>
                      ✅ Resolved ({resolvedFlags.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resolvedFlags.map(f => (
                        <FlagListItem
                          key={f.id}
                          flag={f}
                          t={t}
                          onClick={() => setDetailModalId(f.id)}
                          resolved
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {flags.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${t.sidebarBorder}`,
              background: t.navHover + '33',
              textAlign: 'center',
            }}>
              <a
                href="/admin/funding/fraud"
                style={{
                  fontSize: 12, color: '#EF4444', fontWeight: 700, textDecoration: 'none',
                }}
              >
                Buka Fraud Dashboard ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal (nested) */}
      <FraudFlagDetailModal
        open={!!detailModalId}
        flagId={detailModalId}
        initialMode="view"
        onClose={() => setDetailModalId(null)}
        onSuccess={() => {
          // Refresh flag list in this modal
          const tk = localStorage.getItem('tl_token');
          if (tk && targetId) {
            fetch(`${API_URL}/fraud/admin/flags?target_id=${targetId}&limit=50`, {
              headers: { Authorization: `Bearer ${tk}` },
            })
              .then(r => r.json())
              .then(json => { if (json.success) setFlags(json.data ?? []); });
          }
          // Let parent know
          onFlagResolved?.();
        }}
        onToast={showToast}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 75,
          padding: '12px 20px', borderRadius: 12,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontWeight: 600, fontSize: 14, maxWidth: 420,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

// ── Sub-component: single flag item in list ─────

function FlagListItem({
  flag,
  t,
  onClick,
  resolved = false,
}: {
  flag: FraudFlag;
  t: any;
  onClick: () => void;
  resolved?: boolean;
}) {
  const sev = SEVERITY_STYLE[flag.severity] ?? SEVERITY_STYLE.low;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 12, borderRadius: 10,
        background: resolved ? t.navHover + '33' : sev.bg,
        border: `1px solid ${resolved ? t.sidebarBorder : sev.accent + '55'}`,
        borderLeft: `3px solid ${resolved ? t.textMuted : sev.accent}`,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        opacity: resolved ? 0.75 : 1,
        transition: 'all 120ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateX(2px)';
        e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Severity pill */}
      <div style={{
        flexShrink: 0,
        padding: '3px 8px', borderRadius: 999,
        background: '#fff',
        color: sev.text,
        fontSize: 9, fontWeight: 800, letterSpacing: '0.03em',
      }}>
        {sev.label}
      </div>

      {/* Flag info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: resolved ? t.textDim : t.textPrimary,
          marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {flag.label ?? flag.signal_code}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10 }}>
          <span style={{ color: sev.text, fontFamily: 'monospace', fontWeight: 700 }}>
            {flag.signal_code}
          </span>
          <span style={{ color: t.textMuted }}>·</span>
          <span style={{ color: t.textDim }}>
            Confidence {Math.round(flag.confidence * 100)}%
          </span>
          <span style={{ color: t.textMuted }}>·</span>
          <span style={{ color: t.textDim }}>
            {timeAgo(flag.detected_at)}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <div style={{ color: t.textMuted, flexShrink: 0 }}>
        <Icons.ChevRight />
      </div>
    </button>
  );
}

// ── Style helpers ────────────────────────────────

function sectionLabelStyle(t: any, accent: string): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700, color: accent,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  };
}
