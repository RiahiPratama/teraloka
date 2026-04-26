'use client';

import { useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

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

// ── Types ─────────────────────────────────────────
export interface FlowData {
  total_in: number;
  total_disbursed: number;
  remaining_at_partner: number;
  total_fee_expected: number;
  total_fee_remitted: number;
  disbursement_rate: number;
  donor_count: number;
  unique_donor_count: number;
  anonymous_donor_count: number;
  donation_count: number;
  active_campaigns: number;
  report_count: number;
  approved_report_count: number;
  campaigns_with_report: number;
}

// ═══════════════════════════════════════════════════════════════
// CASHFLOW FLOW DIAGRAM
// ═══════════════════════════════════════════════════════════════

export default function CashflowFlowDiagram({ data }: { data: FlowData }) {
  const { t } = useContext(AdminThemeContext);

  const hasData = data.total_in > 0;

  if (!hasData) {
    return (
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16,
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>💧</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Belum ada aliran dana pada rentang waktu ini
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Coba ubah rentang tanggal, atau tunggu donasi pertama terverifikasi.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16,
      padding: '20px 16px',
      overflow: 'hidden',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        textAlign: 'center',
      }}>
        Alur Dana
      </p>

      <svg
        viewBox="0 0 900 380"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', maxWidth: 900, height: 'auto', display: 'block', margin: '0 auto' }}
      >
        {/* Arrow marker defs */}
        <defs>
          <marker id="arrow-pink" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EC4899" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
          </marker>
          <marker id="arrow-orange" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EA580C" />
          </marker>
        </defs>

        {/* ═══ FLOW ARROWS (drawn first so boxes sit on top) ═══ */}

        {/* Donor → Partner (pink) */}
        <line x1="260" y1="110" x2="370" y2="110"
              stroke="#EC4899" strokeWidth="3" markerEnd="url(#arrow-pink)" />
        <text x="315" y="95" textAnchor="middle" fontSize="13" fontWeight="700" fill="#EC4899">
          {formatRupiah(data.total_in)}
        </text>
        <text x="315" y="128" textAnchor="middle" fontSize="10" fill="#EC4899" opacity="0.7">
          masuk
        </text>

        {/* Partner → Beneficiary (green) */}
        <line x1="560" y1="110" x2="670" y2="110"
              stroke="#10B981" strokeWidth="3" markerEnd="url(#arrow-green)" />
        <text x="615" y="95" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10B981">
          {formatRupiah(data.total_disbursed)}
        </text>
        <text x="615" y="128" textAnchor="middle" fontSize="10" fill="#10B981" opacity="0.7">
          disalurkan
        </text>

        {/* Partner → TeraLoka (orange, vertical) */}
        <line x1="465" y1="170" x2="465" y2="260"
              stroke="#EA580C" strokeWidth="3" strokeDasharray="6 4" markerEnd="url(#arrow-orange)" />
        <text x="480" y="218" fontSize="12" fontWeight="700" fill="#EA580C">
          {formatRupiah(data.total_fee_expected)}
        </text>
        <text x="480" y="234" fontSize="9" fill="#EA580C" opacity="0.7">
          fee operasional
        </text>

        {/* ═══ BOXES ═══ */}

        {/* DONOR BOX */}
        <rect x="50" y="60" width="210" height="100" rx="14"
              fill="#6366F1" fillOpacity="0.12" stroke="#6366F1" strokeWidth="2" />
        <text x="155" y="90" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#6366F1" letterSpacing="1.5">
          DONOR
        </text>
        <text x="155" y="120" textAnchor="middle" fontSize="18" fontWeight="800" fill="#6366F1">
          {data.donor_count}
        </text>
        <text x="155" y="142" textAnchor="middle" fontSize="11" fill="#6366F1" opacity="0.8">
          donatur
        </text>

        {/* PARTNER BOX */}
        <rect x="370" y="60" width="190" height="100" rx="14"
              fill="#EC4899" fillOpacity="0.12" stroke="#EC4899" strokeWidth="2" />
        <text x="465" y="90" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#EC4899" letterSpacing="1.5">
          PARTNER
        </text>
        <text x="465" y="120" textAnchor="middle" fontSize="18" fontWeight="800" fill="#EC4899">
          {data.active_campaigns}
        </text>
        <text x="465" y="142" textAnchor="middle" fontSize="11" fill="#EC4899" opacity="0.8">
          kampanye aktif
        </text>

        {/* BENEFICIARY BOX */}
        <rect x="670" y="60" width="200" height="100" rx="14"
              fill="#10B981" fillOpacity="0.12" stroke="#10B981" strokeWidth="2" />
        <text x="770" y="90" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#10B981" letterSpacing="1.5">
          BENEFICIARY
        </text>
        <text x="770" y="120" textAnchor="middle" fontSize="18" fontWeight="800" fill="#10B981">
          {data.report_count}
        </text>
        <text x="770" y="142" textAnchor="middle" fontSize="11" fill="#10B981" opacity="0.8">
          laporan penggunaan
        </text>

        {/* TERALOKA BOX (below partner) */}
        <rect x="370" y="265" width="190" height="85" rx="14"
              fill="#BE185D" fillOpacity="0.12" stroke="#BE185D" strokeWidth="2" />
        <text x="465" y="292" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#BE185D" letterSpacing="1.5">
          TERALOKA
        </text>
        <text x="465" y="316" textAnchor="middle" fontSize="15" fontWeight="800" fill="#BE185D">
          {formatRupiah(data.total_fee_remitted)}
        </text>
        <text x="465" y="336" textAnchor="middle" fontSize="10" fill="#BE185D" opacity="0.8">
          dari expected {formatRupiah(data.total_fee_expected)}
        </text>

        {/* Remaining at partner indicator (subtle) */}
        {data.remaining_at_partner > 0 && (
          <g>
            <text x="465" y="180" textAnchor="middle" fontSize="10" fontWeight="600"
                  fill={t.textMuted} opacity="0.8">
              ⌛ sisa di partner: {formatRupiah(data.remaining_at_partner)}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
        marginTop: 12, paddingTop: 12,
        borderTop: `1px solid ${t.sidebarBorder}`,
      }}>
        <LegendItem color="#EC4899" label="Donasi masuk" />
        <LegendItem color="#10B981" label="Disalurkan (laporan)" />
        <LegendItem color="#EA580C" label="Fee operasional" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 20, height: 3, borderRadius: 999,
        background: color,
      }} />
      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
    </div>
  );
}
