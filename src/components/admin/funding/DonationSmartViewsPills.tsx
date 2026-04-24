'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

export type DonationSmartViewKey =
  | 'verify_urgent'
  | 'large_amount'
  | 'duplicate_donor'
  | 'round_amount'
  | 'anon_large'
  | 'inactive_campaign';

export interface DonationSmartViewCounts {
  verify_urgent: number;
  large_amount: number;
  duplicate_donor: number;
  round_amount: number;
  anon_large: number;
  inactive_campaign: number;
}

const PILL_CONFIG: {
  key: DonationSmartViewKey;
  label: string;
  emoji: string;
  accent: string;
  description: string;
}[] = [
  { key: 'verify_urgent',     label: 'Verifikasi Segera',  emoji: '🚨', accent: '#EF4444', description: 'Pending >24 jam — donor menunggu lama' },
  { key: 'large_amount',      label: 'Donasi Besar',       emoji: '💰', accent: '#F59E0B', description: 'Amount ≥ Rp 1 juta — butuh review ekstra' },
  { key: 'duplicate_donor',   label: 'Donor Duplikat',     emoji: '🔁', accent: '#DC2626', description: 'Phone yang sama dalam 24 jam — fraud signal' },
  { key: 'round_amount',      label: 'Angka Bulat',        emoji: '🎯', accent: '#8B5CF6', description: 'Amount kelipatan 1000 tanpa kode unik — suspicious' },
  { key: 'anon_large',        label: 'Anonim Besar',       emoji: '🎭', accent: '#EC4899', description: 'Anonim + amount ≥ Rp 500k — pattern tidak biasa' },
  { key: 'inactive_campaign', label: 'Kampanye Tidak Aktif', emoji: '⚠️', accent: '#6366F1', description: 'Donasi ke kampanye completed/rejected — perlu cek' },
];

export default function DonationSmartViewsPills({
  counts,
  selected,
  onSelect,
}: {
  counts: DonationSmartViewCounts | null;
  selected: DonationSmartViewKey | null;
  onSelect: (key: DonationSmartViewKey | null) => void;
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
                border: `1px solid ${isActive ? pill.accent : t.sidebarBorder}`,
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
