'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import {
  Eye, Shield, HandCoins, Target, User, ShieldCheck,
  ExternalLink, ChevronRight, Square, CheckSquare,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────
export interface FraudFlag {
  id: string;
  target_type: 'donation' | 'campaign' | 'user';
  target_id: string;
  signal_code: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  status: 'active' | 'resolved';
  resolution?: 'false_positive' | 'confirmed' | 'escalated' | null;
  resolution_notes?: string | null;
  detected_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  // Enrichment from listFlags
  label?: string;
  description?: string;
  suggested_action?: string;
  // Extra from getFlagDetail
  donation?: any;
  campaign?: any;
}

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
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}bl lalu`;
  return `${Math.floor(months / 12)}th lalu`;
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; label: string; accent: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)',  text: '#DC2626', label: 'CRITICAL', accent: '#EF4444' },
  high:     { bg: 'rgba(249,115,22,0.15)', text: '#EA580C', label: 'HIGH',     accent: '#F97316' },
  medium:   { bg: 'rgba(245,158,11,0.15)', text: '#D97706', label: 'MEDIUM',   accent: '#F59E0B' },
  low:      { bg: 'rgba(59,130,246,0.15)', text: '#2563EB', label: 'LOW',      accent: '#3B82F6' },
};

// ⭐ Mission 2P: Target labels with Lucide icons (no emoji)
const TARGET_CONFIG: Record<string, { label: string; Icon: any; color: string; route: string }> = {
  donation: { label: 'Donasi',   Icon: HandCoins, color: '#10B981', route: '/admin/funding/donations' },
  campaign: { label: 'Kampanye', Icon: Target,    color: '#8B5CF6', route: '/admin/funding/campaigns' },
  user:     { label: 'User',     Icon: User,      color: '#3B82F6', route: '' },
};

// ⭐ Mission 2P-B: 3T-aware signals
// Signal yang berpotensi FALSE POSITIVE karena kondisi 3T Maluku Utara
// (sinyal terbatas, ekonomi tunai, pola hidup pesisir, HP dipakai bersama).
// Signal codes HARUS match backend fraud-engine (UPPERCASE).
//   - OFF_HOURS_SPIKE: pola tidur/aktivitas beda (nelayan dini hari, interpretasi timezone)
//   - VELOCITY_SPIKE:  donasi viral via WA grup kampung = natural di komunitas kecil
//   - RAPID_FIRE:      1 HP dipakai rame-rame (keluarga/warnet) di area sinyal terbatas
//   - ROUND_CLUSTER:   ekonomi tunai → donasi angka bulat (50rb/100rb) wajar
const SIGNALS_3T_AWARE = new Set([
  'OFF_HOURS_SPIKE',
  'VELOCITY_SPIKE',
  'RAPID_FIRE',
  'ROUND_CLUSTER',
]);

// ═══════════════════════════════════════════════════════════════
// FRAUD FLAGS TABLE
// ═══════════════════════════════════════════════════════════════

export default function FraudFlagsTable({
  flags,
  onRowAction,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  flags: FraudFlag[];
  onRowAction: (action: 'view' | 'resolve', flag: FraudFlag) => void;
  // ⭐ Mission 2P-C: bulk selection (optional — kalau gak dikasih, checkbox hidden)
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const { t } = useContext(AdminThemeContext);

  // ⭐ Mission 2P-C: selection enabled hanya kalau props lengkap
  const selectionEnabled = !!(selectedIds && onToggleSelect && onToggleAll);
  const activeFlags = flags.filter(f => f.status === 'active');
  const selectedActiveCount = selectionEnabled
    ? activeFlags.filter(f => selectedIds!.has(f.id)).length
    : 0;
  const allActiveSelected = activeFlags.length > 0 && selectedActiveCount === activeFlags.length;

  if (flags.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', marginBottom: 10, color: '#10B981' }}>
          <ShieldCheck size={40} strokeWidth={1.8} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada fraud flag
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Sistem aman. Flag akan muncul otomatis saat fraud signals terdeteksi.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
              {selectionEnabled && (
                <th style={thStyle(t, 'center', 44)}>
                  <button
                    onClick={onToggleAll}
                    disabled={activeFlags.length === 0}
                    title={allActiveSelected ? 'Batalkan semua' : 'Pilih semua flag aktif'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', padding: 0,
                      color: allActiveSelected ? '#8B5CF6' : t.textDim,
                      cursor: activeFlags.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: activeFlags.length === 0 ? 0.4 : 1,
                    }}
                  >
                    {allActiveSelected
                      ? <CheckSquare size={16} strokeWidth={2.2} />
                      : <Square size={16} strokeWidth={2.2} />}
                  </button>
                </th>
              )}
              <th style={thStyle(t, 'left')}>Signal & Target</th>
              <th style={thStyle(t, 'center', 100)}>Severity</th>
              <th style={thStyle(t, 'center', 90)}>Confidence</th>
              <th style={thStyle(t, 'left', 280)}>Detail</th>
              <th style={thStyle(t, 'center', 90)}>Waktu</th>
              <th style={thStyle(t, 'right', 110)}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f, idx) => {
              const isLast = idx === flags.length - 1;
              const sev = SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low;
              const targetCfg = TARGET_CONFIG[f.target_type] ?? TARGET_CONFIG.user;
              const TargetIcon = targetCfg.Icon;
              const isActive = f.status === 'active';
              const confidencePercent = Math.round(f.confidence * 100);
              const is3T = SIGNALS_3T_AWARE.has(f.signal_code);

              return (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                    borderLeft: `3px solid ${sev.accent}`,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.navHover + '33'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* ⭐ Mission 2P-C: Checkbox (disabled untuk resolved) */}
                  {selectionEnabled && (
                    <td style={tdStyle(t, 'center')}>
                      <button
                        onClick={() => isActive && onToggleSelect!(f.id)}
                        disabled={!isActive}
                        title={isActive ? 'Pilih flag' : 'Sudah resolved'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', padding: 0,
                          color: selectedIds!.has(f.id) ? '#8B5CF6' : t.textDim,
                          cursor: isActive ? 'pointer' : 'not-allowed',
                          opacity: isActive ? 1 : 0.3,
                        }}
                      >
                        {selectedIds!.has(f.id)
                          ? <CheckSquare size={15} strokeWidth={2.2} />
                          : <Square size={15} strokeWidth={2.2} />}
                      </button>
                    </td>
                  )}
                  {/* Signal & Target */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: sev.bg, color: sev.text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Shield size={14} strokeWidth={2.5} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 13, fontWeight: 700, color: t.textPrimary,
                          marginBottom: 2,
                        }}>
                          <span style={{
                            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {f.label ?? f.signal_code}
                          </span>
                          {/* ⭐ Mission 2P-B: 3T-aware badge */}
                          {is3T && (
                            <span 
                              title="Signal ini sering false positive karena kondisi 3T Maluku Utara"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 2,
                                fontSize: 9, fontWeight: 700,
                                padding: '1px 6px', borderRadius: 999,
                                background: 'rgba(139,92,246,0.15)',
                                color: '#8B5CF6',
                                cursor: 'help',
                                flexShrink: 0,
                              }}>
                              3T
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10 }}>
                          <span style={{ color: sev.text, fontWeight: 600, fontFamily: 'monospace' }}>
                            {f.signal_code}
                          </span>
                          <span style={{ color: t.textMuted }}>·</span>
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            color: targetCfg.color, fontWeight: 600,
                          }}>
                            <TargetIcon size={10} strokeWidth={2.5} />
                            {targetCfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Severity Badge */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      display: 'inline-block',
                      background: sev.bg, color: sev.text,
                      fontSize: 10, fontWeight: 800,
                      padding: '4px 10px', borderRadius: 999,
                      letterSpacing: '0.05em',
                    }}>
                      {sev.label}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                        {confidencePercent}%
                      </span>
                      <div style={{
                        width: 56, height: 4, borderRadius: 2,
                        background: t.navHover, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${confidencePercent}%`, height: '100%',
                          background: sev.accent,
                        }} />
                      </div>
                    </div>
                  </td>

                  {/* Detail Preview */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{
                      fontSize: 11, color: t.textDim,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}>
                      {renderDetailsPreview(f.details)}
                    </div>
                  </td>

                  {/* Time Ago */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {timeAgo(f.detected_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      {/* ⭐ Mission 2P-B: Cross-navigation - Buka entity asli */}
                      {(f.target_type === 'donation' || f.target_type === 'campaign') && (
                        <a
                          href={f.target_type === 'donation' 
                            ? `/admin/funding/donations?status=all&q=${f.target_id}`
                            : `/admin/funding/campaigns/${f.target_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title={`Buka ${TARGET_CONFIG[f.target_type].label} asli`}
                          style={{
                            ...actionBtnStyle(t, 'neutral'),
                            color: TARGET_CONFIG[f.target_type].color,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={13} strokeWidth={2.2} />
                        </a>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onRowAction('view', f); }}
                        title="Detail"
                        style={actionBtnStyle(t, 'neutral')}
                      >
                        <Eye size={13} strokeWidth={2.2} />
                      </button>
                      {isActive && (
                        <button
                          onClick={e => { e.stopPropagation(); onRowAction('resolve', f); }}
                          title="Resolve"
                          style={{
                            ...actionBtnStyle(t, 'neutral'),
                            background: sev.bg,
                            color: sev.text,
                            borderColor: sev.accent + '66',
                            fontWeight: 700,
                            padding: '0 10px',
                            width: 'auto',
                            fontSize: 11,
                          }}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helper: render details preview ────────────────

function renderDetailsPreview(details: Record<string, any>): string {
  if (!details || Object.keys(details).length === 0) return '-';

  // Pick a few important keys, limit length
  const snippets: string[] = [];

  if (details.partner_name) snippets.push(`Partner: ${details.partner_name}`);
  if (details.beneficiary_name) snippets.push(`Beneficiary: ${details.beneficiary_name}`);
  if (details.similarity !== undefined) snippets.push(`Similarity: ${Math.round(details.similarity * 100)}%`);
  if (details.count !== undefined) snippets.push(`Count: ${details.count}`);
  if (details.rejected_reports_count !== undefined) snippets.push(`Rejected: ${details.rejected_reports_count}`);
  if (details.active_campaigns_count !== undefined) snippets.push(`Active campaigns: ${details.active_campaigns_count}`);
  if (details.multiplier !== undefined) snippets.push(`Multiplier: ${details.multiplier}x`);
  if (details.current_amount !== undefined) snippets.push(`Amount: Rp${Number(details.current_amount).toLocaleString('id-ID')}`);
  if (details.target_amount !== undefined) snippets.push(`Target: Rp${Number(details.target_amount).toLocaleString('id-ID')}`);

  if (snippets.length === 0) {
    // Fallback: first 2 keys
    const keys = Object.keys(details).slice(0, 2);
    return keys.map(k => `${k}: ${details[k]}`).join(' · ');
  }

  return snippets.slice(0, 3).join(' · ');
}

// ── Style helpers ────────────────────────────────

function thStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    width: width ? `${width}px` : 'auto',
  };
}

function tdStyle(t: any, align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px',
    verticalAlign: 'middle',
    color: t.textPrimary,
  };
}

function actionBtnStyle(t: any, variant: 'neutral'): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 7,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.navHover, color: t.textPrimary,
    cursor: 'pointer',
    transition: 'transform 100ms',
  };
}
