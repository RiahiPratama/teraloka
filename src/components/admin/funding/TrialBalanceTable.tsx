'use client';

// [BADONASI-FINANCIAL-TABLE] Tabel jurnal Db/Cr per buku (reusable — detail donasi Fase A,
// kampanye Fase B). Murni presentational: terima sections[], render akun + TOTAL + badge
// Balance/Selisih. Mapping payload → sections dilakukan oleh pemanggil. Token t.* dark.

import { formatRupiah } from '@/utils/format';
import type { AdminTheme } from '@/components/admin/AdminThemeContext';

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceSection {
  label: string;
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  balanced: boolean;
}

export default function TrialBalanceTable({
  sections,
  t,
}: {
  sections: TrialBalanceSection[];
  t: AdminTheme;
}) {
  if (!sections.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sections.map((s, i) => (
        <div key={`${s.label}-${i}`} style={{
          border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: 'hidden', background: t.card,
        }}>
          {/* Header buku + badge balance */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderBottom: `1px solid ${t.cardBorder}`, background: t.navHover + '55',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>{s.label}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: s.balanced ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: s.balanced ? '#34D399' : '#F87171',
            }}>
              {s.balanced ? '✓ Balance' : '✗ Selisih'}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{
                color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
                fontSize: 9, borderBottom: `1px solid ${t.cardBorder}`,
              }}>
                <th style={cell('left')}>Akun</th>
                <th style={cell('right')}>Debit</th>
                <th style={cell('right')}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, j) => (
                <tr key={`${r.account_code}-${j}`} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                  <td style={{ ...cell('left'), color: t.textPrimary }}>
                    <span style={{ fontFamily: 'monospace', color: t.textDim, marginRight: 6 }}>{r.account_code}</span>
                    {r.account_name}
                  </td>
                  <td style={{ ...cell('right'), fontVariantNumeric: 'tabular-nums', color: r.debit ? t.textPrimary : t.textDim }}>
                    {r.debit ? formatRupiah(r.debit) : '—'}
                  </td>
                  <td style={{ ...cell('right'), fontVariantNumeric: 'tabular-nums', color: r.credit ? t.textPrimary : t.textDim }}>
                    {r.credit ? formatRupiah(r.credit) : '—'}
                  </td>
                </tr>
              ))}
              {/* TOTAL */}
              <tr style={{ background: t.navHover + '33' }}>
                <td style={{ ...cell('left'), fontWeight: 800, color: t.textPrimary }}>TOTAL</td>
                <td style={{ ...cell('right'), fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: t.textPrimary }}>
                  {formatRupiah(s.total_debit)}
                </td>
                <td style={{ ...cell('right'), fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: t.textPrimary }}>
                  {formatRupiah(s.total_credit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function cell(align: 'left' | 'right'): React.CSSProperties {
  return { textAlign: align, padding: '7px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' };
}
