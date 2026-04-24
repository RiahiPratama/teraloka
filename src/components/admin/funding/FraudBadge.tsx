'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icon ──────────────────────────────────────────
const ShieldIcon = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── Props ─────────────────────────────────────────
interface FraudBadgeProps {
  /** Total fraud flags count for this target */
  count: number;
  /** Count of high + critical severity flags (for color intensity) */
  highSeverityCount?: number;
  /** Count of critical severity flags */
  criticalCount?: number;
  /** Called when user clicks the badge */
  onClick?: (e: React.MouseEvent) => void;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Whether to show label "flag(s)" next to count */
  showLabel?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// FRAUD BADGE — Compact indicator
// Returns null if count === 0 (no visual clutter for clean entities)
// ═══════════════════════════════════════════════════════════════

export default function FraudBadge({
  count,
  highSeverityCount = 0,
  criticalCount = 0,
  onClick,
  size = 'sm',
  showLabel = true,
}: FraudBadgeProps) {
  const { t } = useContext(AdminThemeContext);

  if (!count || count <= 0) return null;

  // Determine color based on severity
  // critical > 0 → red, high > 0 → orange, else → yellow
  let color: string;
  let bg: string;
  let border: string;
  let label: string;

  if (criticalCount > 0) {
    color = '#DC2626';
    bg = 'rgba(239,68,68,0.12)';
    border = 'rgba(239,68,68,0.35)';
    label = 'CRITICAL';
  } else if (highSeverityCount > 0) {
    color = '#EA580C';
    bg = 'rgba(249,115,22,0.12)';
    border = 'rgba(249,115,22,0.35)';
    label = 'HIGH';
  } else {
    color = '#D97706';
    bg = 'rgba(245,158,11,0.12)';
    border = 'rgba(245,158,11,0.35)';
    label = 'MED';
  }

  // Size presets
  const sizes = {
    xs: { padding: '2px 6px', fontSize: 9, iconSize: 9, gap: 3 },
    sm: { padding: '3px 8px', fontSize: 10, iconSize: 11, gap: 4 },
    md: { padding: '4px 10px', fontSize: 11, iconSize: 12, gap: 5 },
  };
  const s = sizes[size];

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(e);
      }
    : undefined;

  return (
    <button
      onClick={handleClick}
      disabled={!onClick}
      title={`${count} fraud flag${count > 1 ? 's' : ''} detected${criticalCount > 0 ? ' (Critical severity)' : highSeverityCount > 0 ? ' (High severity)' : ''} — klik untuk review`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: s.gap,
        padding: s.padding, borderRadius: 999,
        background: bg, color,
        border: `1px solid ${border}`,
        fontSize: s.fontSize, fontWeight: 800,
        letterSpacing: '0.03em',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        transition: 'transform 120ms, box-shadow 120ms',
        lineHeight: 1,
        animation: criticalCount > 0 ? 'fraud-pulse 2s ease-in-out infinite' : 'none',
      }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = `0 2px 8px ${color}33`;
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      } : undefined}
    >
      <ShieldIcon size={s.iconSize} />
      <span>{count}</span>
      {showLabel && <span style={{ opacity: 0.8, fontSize: s.fontSize - 1 }}>{label}</span>}

      {/* Pulsing animation for critical */}
      <style jsx>{`
        @keyframes fraud-pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${color}55; }
          50% { box-shadow: 0 0 0 4px ${color}00; }
        }
      `}</style>
    </button>
  );
}
