'use client';

import { useContext, useState, useEffect } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ── Quick Amount Presets ────────────────────────────
const AMOUNT_PRESETS = [
  { label: '< 100rb',     min: '',        max: '99999' },
  { label: '100rb-500rb', min: '100000',  max: '500000' },
  { label: '500rb-1jt',   min: '500000',  max: '1000000' },
  { label: '1jt-5jt',     min: '1000000', max: '5000000' },
  { label: '> 5jt',       min: '5000000', max: '' },
];

const DONOR_TYPE_OPTIONS = [
  { key: '',    label: 'Semua' },
  { key: '0',   label: 'Bernama' },
  { key: '1',   label: 'Anonim' },
];

// ── Types ─────────────────────────────────────────
export interface DonationFiltersState {
  amountMin: string;
  amountMax: string;
  anonFilter: string;  // '' | '0' | '1'
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_DONATION_FILTERS: DonationFiltersState = {
  amountMin: '',
  amountMax: '',
  anonFilter: '',
  dateFrom: '',
  dateTo: '',
};

export function countActiveDonationFilters(f: DonationFiltersState): number {
  let n = 0;
  if (f.amountMin || f.amountMax) n++;
  if (f.anonFilter) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED FILTERS DRAWER
// ═══════════════════════════════════════════════════════════════

export default function DonationsAdvancedFiltersDrawer({
  open,
  filters,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  filters: DonationFiltersState;
  onClose: () => void;
  onApply: (filters: DonationFiltersState) => void;
  onReset: () => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const [draft, setDraft] = useState<DonationFiltersState>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(EMPTY_DONATION_FILTERS);
    onReset();
    onClose();
  };

  const applyPreset = (min: string, max: string) => {
    setDraft(d => ({ ...d, amountMin: min, amountMax: max }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 400,
        background: t.mainBg,
        borderLeft: `1px solid ${t.sidebarBorder}`,
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#EC4899' }}><Icons.Filter /></span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
              Filter Lanjutan
            </h3>
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

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Amount Range */}
          <FilterSection label="Rentang Nominal" t={t}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {AMOUNT_PRESETS.map(preset => {
                const active = draft.amountMin === preset.min && draft.amountMax === preset.max;
                return (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.min, preset.max)}
                    style={pillStyle(t, active)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Min (Rp)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={draft.amountMin}
                  onChange={e => setDraft(d => ({ ...d, amountMin: e.target.value }))}
                  style={inputStyle(t)}
                />
              </div>
              <span style={{ fontSize: 12, color: t.textDim, marginTop: 16 }}>s/d</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Max (Rp)
                </label>
                <input
                  type="number"
                  placeholder="tidak terbatas"
                  value={draft.amountMax}
                  onChange={e => setDraft(d => ({ ...d, amountMax: e.target.value }))}
                  style={inputStyle(t)}
                />
              </div>
            </div>
          </FilterSection>

          {/* Tipe Donor */}
          <FilterSection label="Tipe Donor" t={t}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DONOR_TYPE_OPTIONS.map(opt => {
                const active = draft.anonFilter === opt.key;
                return (
                  <button
                    key={opt.key || 'all'}
                    onClick={() => setDraft(d => ({ ...d, anonFilter: opt.key }))}
                    style={pillStyle(t, active)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
              {draft.anonFilter === '1'
                ? 'Hanya tampilkan donasi anonim.'
                : draft.anonFilter === '0'
                  ? 'Hanya tampilkan donasi dengan nama.'
                  : 'Tampilkan semua tipe donor.'}
            </p>
          </FilterSection>

          {/* Date Range */}
          <FilterSection label="Tanggal Donasi" t={t}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={draft.dateFrom}
                onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                style={{ ...inputStyle(t), flex: 1 }}
              />
              <span style={{ fontSize: 12, color: t.textDim }}>s/d</span>
              <input
                type="date"
                value={draft.dateTo}
                onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                style={{ ...inputStyle(t), flex: 1 }}
              />
            </div>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
              Filter donasi yang dibuat pada rentang tanggal ini.
            </p>
          </FilterSection>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: `1px solid ${t.sidebarBorder}`,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              background: 'transparent', color: t.textPrimary,
              border: `1px solid ${t.sidebarBorder}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reset Semua
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1.5, padding: '12px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg, #EC4899, #BE185D)',
              color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
            }}
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sub Components ────────────────────────────────

function FilterSection({ label, children, t }: {
  label: string; children: React.ReactNode; t: any;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 10,
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function inputStyle(t: any): React.CSSProperties {
  return {
    width: '100%', padding: '9px 12px',
    borderRadius: 10,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}

function pillStyle(t: any, active: boolean): React.CSSProperties {
  return {
    padding: '7px 12px', borderRadius: 999,
    border: `1px solid ${active ? '#EC4899' : t.sidebarBorder}`,
    background: active ? '#EC4899' : t.mainBg,
    color: active ? '#fff' : t.textPrimary,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 120ms', whiteSpace: 'nowrap',
  };
}
