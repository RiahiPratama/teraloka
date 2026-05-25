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
  total_in: number;                          // GROSS = total_transfer
  total_beneficiary?: number;                // ⭐ Alokasi penerima manfaat
  total_penggalang_fee?: number;             // ⭐ Tip Partner
  total_kode_unik?: number;                  // ⭐ Kode unik
  total_in_verified?: number;
  total_in_under_audit?: number;
  total_beneficiary_verified?: number;
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

export default function CashflowFlowDiagram({ 
  data, 
  onCardClick,
}: { 
  data: FlowData;
  onCardClick?: (category: 'beneficiary' | 'fee_teraloka' | 'tip' | 'kode_unik' | 'hak_beneficiary') => void;
}) {
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
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8B5CF6" />
          </marker>
        </defs>

        {/* ═══ FLOW ARROWS (drawn first so boxes sit on top) ═══ */}

        {/* Donor → Partner (pink) — GROSS total_transfer */}
        <line x1="260" y1="110" x2="370" y2="110"
              stroke="#EC4899" strokeWidth="3" markerEnd="url(#arrow-pink)" />
        <text x="315" y="95" textAnchor="middle" fontSize="13" fontWeight="700" fill="#EC4899">
          {formatRupiah(data.total_in)}
        </text>
        <text x="315" y="128" textAnchor="middle" fontSize="10" fill="#EC4899" opacity="0.7">
          total transfer
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

        {/* Partner → TeraLoka (orange, diagonal kiri-bawah) */}
        <line x1="410" y1="170" x2="340" y2="260"
              stroke="#EA580C" strokeWidth="3" strokeDasharray="6 4" markerEnd="url(#arrow-orange)" />
        <text x="290" y="225" fontSize="12" fontWeight="700" fill="#EA580C">
          {formatRupiah(data.total_fee_expected)}
        </text>
        <text x="290" y="241" fontSize="9" fill="#EA580C" opacity="0.7">
          fee operasional
        </text>

        {/* ⭐ Partner → PENGGALANG (purple, diagonal kanan-bawah, sejajar Teraloka) */}
        {((data.total_penggalang_fee ?? 0) > 0 || (data.total_kode_unik ?? 0) > 0) && (
          <g>
            <line x1="520" y1="170" x2="590" y2="260"
                  stroke="#8B5CF6" strokeWidth="3" strokeDasharray="6 4" markerEnd="url(#arrow-purple)" />
            <text x="595" y="225" fontSize="12" fontWeight="700" fill="#8B5CF6">
              {formatRupiah((data.total_penggalang_fee ?? 0) + (data.total_kode_unik ?? 0))}
            </text>
            <text x="595" y="241" fontSize="9" fill="#8B5CF6" opacity="0.7">
              tip + kode unik
            </text>
          </g>
        )}

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
              fill="#F59E0B" fillOpacity="0.12" stroke="#F59E0B" strokeWidth="2" />
        <text x="465" y="90" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#F59E0B" letterSpacing="1.5">
          PARTNER
        </text>
        <text x="465" y="120" textAnchor="middle" fontSize="18" fontWeight="800" fill="#F59E0B">
          {data.active_campaigns}
        </text>
        <text x="465" y="142" textAnchor="middle" fontSize="11" fill="#F59E0B" opacity="0.8">
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

        {/* TERALOKA BOX (kiri-bawah Partner, sejajar dengan PENGGALANG) */}
        <rect x="250" y="265" width="180" height="85" rx="14"
              fill="#BE185D" fillOpacity="0.12" stroke="#BE185D" strokeWidth="2" />
        <text x="340" y="292" textAnchor="middle" fontSize="11" fontWeight="700"
              fill="#BE185D" letterSpacing="1.5">
          TERALOKA
        </text>
        <text x="340" y="316" textAnchor="middle" fontSize="15" fontWeight="800" fill="#BE185D">
          {formatRupiah(data.total_fee_remitted)}
        </text>
        <text x="340" y="336" textAnchor="middle" fontSize="10" fill="#BE185D" opacity="0.8">
          dari expected {formatRupiah(data.total_fee_expected)}
        </text>

        {/* ⭐ PENGGALANG BOX (kanan-bawah Partner, sejajar dengan TERALOKA) */}
        {((data.total_penggalang_fee ?? 0) > 0 || (data.total_kode_unik ?? 0) > 0) && (
          <g>
            <rect x="500" y="265" width="180" height="85" rx="14"
                  fill="#8B5CF6" fillOpacity="0.12" stroke="#8B5CF6" strokeWidth="2" />
            <text x="590" y="292" textAnchor="middle" fontSize="11" fontWeight="700"
                  fill="#8B5CF6" letterSpacing="1.5">
              PENGGALANG
            </text>
            <text x="590" y="316" textAnchor="middle" fontSize="15" fontWeight="800" fill="#8B5CF6">
              {formatRupiah((data.total_penggalang_fee ?? 0) + (data.total_kode_unik ?? 0))}
            </text>
            <text x="590" y="336" textAnchor="middle" fontSize="10" fill="#8B5CF6" opacity="0.8">
              pendapatan Partner
            </text>
          </g>
        )}

        {/* Hak Beneficiary di Partner (Utang Dana Beneficiary belum settled) */}
        {(() => {
          const hakBeneficiary = (data.total_beneficiary ?? 0) - data.total_disbursed;
          if (hakBeneficiary > 0) {
            return (
              <g>
                <text x="465" y="200" textAnchor="middle" fontSize="10" fontWeight="600"
                      fill={t.textMuted} opacity="0.8">
                  ⌛ Hak Beneficiary di Partner: {formatRupiah(hakBeneficiary)}
                </text>
              </g>
            );
          }
          return null;
        })()}
      </svg>

      {/* ⭐ BREAKDOWN TAJAM 4 KOMPONEN (Sesi 12 LOCKED) */}
      {(data.total_beneficiary !== undefined || data.total_penggalang_fee !== undefined) && (
        <div style={{
          marginTop: 16,
          padding: '14px 16px',
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
        }}>
          <p style={{ 
            fontSize: 10, fontWeight: 700, color: t.textMuted, 
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10,
          }}>
            🎯 Breakdown Aliran Uang (Gross {formatRupiah(data.total_in)}) · Klik card untuk detail + CSV
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}>
            <BreakdownItem
              label="Dana Beneficiary"
              amount={data.total_beneficiary ?? 0}
              color="#10B981"
              sublabel="Untuk penerima manfaat"
              onClick={() => onCardClick?.('beneficiary')}
            />
            <BreakdownItem
              label="Fee TeraLoka"
              amount={data.total_fee_expected}
              color="#BE185D"
              sublabel="Kewajiban setor Partner"
              onClick={() => onCardClick?.('fee_teraloka')}
            />
            <BreakdownItem
              label="Tip Penggalang"
              amount={data.total_penggalang_fee ?? 0}
              color="#8B5CF6"
              sublabel="Pendapatan Partner (opt-in)"
              onClick={() => onCardClick?.('tip')}
            />
            <BreakdownItem
              label="Kode Unik"
              amount={data.total_kode_unik ?? 0}
              color="#F59E0B"
              sublabel="3-digit cross-check"
              onClick={() => onCardClick?.('kode_unik')}
            />
          </div>
          {data.total_in_under_audit !== undefined && data.total_in_under_audit > 0 && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 8,
              fontSize: 11,
              color: '#8B5CF6',
            }}>
              ⏳ <strong>Under Audit:</strong> {formatRupiah(data.total_in_under_audit)} (tahan di Penelaahan, belum masuk Aktual)
            </div>
          )}
        </div>
      )}

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

function BreakdownItem({ 
  label, amount, color, sublabel, onClick,
}: { 
  label: string; amount: number; color: string; sublabel: string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.background = `${color}25`;
        e.currentTarget.style.borderColor = `${color}60`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.background = `${color}15`;
        e.currentTarget.style.borderColor = `${color}30`;
        e.currentTarget.style.transform = 'translateY(0)';
      } : undefined}
    >
      <p style={{ 
        fontSize: 10, fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginBottom: 4,
      }}>
        {label} {onClick && <span style={{ opacity: 0.5, fontSize: 9 }}>→</span>}
      </p>
      <p style={{ fontSize: 15, fontWeight: 800, color, marginBottom: 2 }}>
        {formatRupiah(amount)}
      </p>
      <p style={{ fontSize: 10, color, opacity: 0.7 }}>
        {sublabel}
      </p>
    </div>
  );
}
