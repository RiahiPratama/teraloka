'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

export type SmartViewKey =
  | 'needs_attention'
  | 'fraud_alert'
  | 'deadline_soon'
  | 'near_target'
  | 'slow_progress'
  | 'missing_report';

export interface SmartViewCounts {
  needs_attention: number;
  fraud_alert: number;
  deadline_soon: number;
  near_target: number;
  slow_progress: number;
  missing_report: number;
}

const PILL_CONFIG: {
  key: SmartViewKey;
  label: string;
  emoji: string;
  accent: string;
  description: string;
}[] = [
  { key: 'needs_attention', label: 'Perlu Perhatian', emoji: '🔴', accent: '#EF4444', description: 'Urgent + progress <30% + deadline <7 hari' },
  { key: 'fraud_alert',     label: 'Fraud Alert',      emoji: '⚠️', accent: '#DC2626', description: 'Ada fraud flag aktif' },
  { key: 'deadline_soon',   label: 'Deadline Dekat',   emoji: '⏰', accent: '#F59E0B', description: 'Deadline ≤7 hari & progress <80%' },
  { key: 'near_target',     label: 'Near Target',      emoji: '🎯', accent: '#10B981', description: 'Progress ≥75%' },
  { key: 'slow_progress',   label: 'Slow Progress',    emoji: '📉', accent: '#F59E0B', description: 'Progress <10% setelah 14 hari' },
  { key: 'missing_report',  label: 'Missing Report',   emoji: '📋', accent: '#8B5CF6', description: 'Aktif >14 hari tanpa laporan dana' },
];

export default function SmartViewsPills({
  counts,
  selected,
  onSelect,
}: {
  counts: SmartViewCounts | null;
  selected: SmartViewKey | null;
  onSelect: (key: SmartViewKey | null) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: t.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Smart Views
        </span>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            style={{
              fontSize: 11, color: '#EC4899', fontWeight: 600,
              background: 'transparent', border: 'none', cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {PILL_CONFIG.map(pill => {
          const count = counts?.[pill.key] ?? 0;
          const isActive = selected === pill.key;
          const isDisabled = count === 0 && !isActive;

          return (
            <button
              key={pill.key}
              onClick={() => onSelect(isActive ? null : pill.key)}
              disabled={isDisabled}
              title={pill.description}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12, fontWeight: 600,
                border: `1px solid ${
                  isActive ? pill.accent : t.sidebarBorder
                }`,
                background: isActive
                  ? pill.accent + '18'
                  : isDisabled
                    ? 'transparent'
                    : t.mainBg,
                color: isActive
                  ? pill.accent
                  : isDisabled
                    ? t.textMuted
                    : t.textPrimary,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'all 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 11 }}>{pill.emoji}</span>
              <span>{pill.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                minWidth: 20,
                textAlign: 'center',
                background: isActive
                  ? pill.accent
                  : count > 0
                    ? pill.accent + '22'
                    : t.navHover,
                color: isActive
                  ? '#fff'
                  : count > 0
                    ? pill.accent
                    : t.textMuted,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
