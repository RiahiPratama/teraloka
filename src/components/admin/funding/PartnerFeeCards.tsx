'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  FileText:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Clock:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// ── Types ─────────────────────────────────────────
export type AgeBucket = 'ok' | 'warning' | 'overdue' | 'critical';

export interface PartnerFeeSummary {
  partner_name: string;
  total_donations: number;
  remitted_donations: number;
  pending_donations: number;
  total_fee_expected: number;
  total_fee_remitted: number;
  total_fee_pending: number;
  last_remitted_at: string | null;
  oldest_pending_days: number;
  remitted_pct: number;
  age_bucket: AgeBucket;
}

// ── Age Bucket Style Config ──────────────────────
const AGE_BUCKET_CONFIG: Record<AgeBucket, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}> = {
  ok:       { label: 'Aman',      emoji: '🟢', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  warning:  { label: 'Perhatian', emoji: '🟡', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  overdue:  { label: 'Overdue',   emoji: '🟠', color: '#EA580C', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.3)'  },
  critical: { label: 'KRITIS',    emoji: '🔴', color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)'  },
};

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'belum pernah';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

// ═══════════════════════════════════════════════════════════════
// PARTNER FEE CARDS GRID
// ═══════════════════════════════════════════════════════════════

export default function PartnerFeeCards({
  partners,
  onRecordRemittance,
}: {
  partners: PartnerFeeSummary[];
  onRecordRemittance: (partnerName: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  if (partners.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Belum ada partner dengan donasi verified
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Partner dengan donasi yang sudah terverifikasi akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 14,
    }}>
      {partners.map(p => (
        <PartnerCard key={p.partner_name} partner={p} onRecordRemittance={onRecordRemittance} t={t} />
      ))}
    </div>
  );
}

// ── Single Partner Card ──────────────────────────

function PartnerCard({
  partner, onRecordRemittance, t,
}: {
  partner: PartnerFeeSummary;
  onRecordRemittance: (partnerName: string) => void;
  t: any;
}) {
  const bucket = AGE_BUCKET_CONFIG[partner.age_bucket];
  const hasPending = partner.total_fee_pending > 0;
  const progressPct = partner.total_fee_expected > 0
    ? Math.round((partner.total_fee_remitted / partner.total_fee_expected) * 100)
    : 0;

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${partner.age_bucket === 'critical' ? bucket.border : t.sidebarBorder}`,
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'transform 120ms, border-color 120ms',
      boxShadow: partner.age_bucket === 'critical' ? `0 0 0 3px ${bucket.bg}` : 'none',
    }}>
      {/* Header: Partner Name + Age Bucket Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 14, fontWeight: 800, color: t.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
          }}>
            {partner.partner_name}
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 999,
          fontSize: 10, fontWeight: 700,
          background: bucket.bg, color: bucket.color,
          border: `1px solid ${bucket.border}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 9 }}>{bucket.emoji}</span>
          {bucket.label}
        </span>
      </div>

      {/* Amount rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AmountRow label="Expected" value={partner.total_fee_expected} t={t} />
        <AmountRow
          label="Remitted"
          value={partner.total_fee_remitted}
          t={t}
          badge={progressPct > 0 ? `${progressPct}%` : undefined}
          badgeColor="#10B981"
        />
        {hasPending && (
          <div style={{
            background: bucket.bg,
            borderRadius: 8,
            padding: '8px 10px',
            marginTop: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: bucket.color }}>
              Pending
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: bucket.color }}>
              {formatRupiah(partner.total_fee_pending)}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: 4, background: t.navHover, borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: progressPct === 100 ? '#10B981' : 'linear-gradient(90deg, #EC4899, #BE185D)',
            transition: 'width 300ms',
          }} />
        </div>
      </div>

      {/* Metadata */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: t.textMuted }}><Icons.FileText /></span>
          <span style={{ fontSize: 11, color: t.textDim }}>
            {partner.total_donations} donasi ({partner.pending_donations} pending, {partner.remitted_donations} remitted)
          </span>
        </div>
        {hasPending && partner.oldest_pending_days > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: bucket.color }}><Icons.Clock /></span>
            <span style={{
              fontSize: 11,
              color: partner.age_bucket === 'critical' ? bucket.color : t.textDim,
              fontWeight: partner.age_bucket === 'critical' ? 700 : 500,
            }}>
              Oldest pending: {partner.oldest_pending_days} hari
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: t.textMuted }}><Icons.Clock /></span>
          <span style={{ fontSize: 11, color: t.textDim }}>
            Last remit: {timeAgo(partner.last_remitted_at)}
          </span>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={() => onRecordRemittance(partner.partner_name)}
        disabled={!hasPending}
        style={{
          width: '100%', padding: '10px 14px',
          borderRadius: 10,
          border: 'none',
          background: hasPending
            ? 'linear-gradient(135deg, #EC4899, #BE185D)'
            : t.navHover,
          color: hasPending ? '#fff' : t.textMuted,
          fontSize: 12, fontWeight: 700,
          cursor: hasPending ? 'pointer' : 'not-allowed',
          marginTop: 'auto',
          boxShadow: hasPending ? '0 2px 8px rgba(236,72,153,0.25)' : 'none',
          transition: 'transform 120ms',
        }}
      >
        {hasPending ? '🧾 Catat Remittance' : '✓ Sudah Lunas'}
      </button>
    </div>
  );
}

// ── Amount Row Sub-Component ──────────────────────

function AmountRow({
  label, value, t, badge, badgeColor,
}: {
  label: string; value: number; t: any;
  badge?: string; badgeColor?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>
          {label}
        </span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            padding: '1px 6px', borderRadius: 999,
            background: (badgeColor ?? t.textDim) + '22',
            color: badgeColor ?? t.textDim,
          }}>
            {badge}
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
        {formatRupiah(value)}
      </span>
    </div>
  );
}
