'use client';

import { useContext, useState, useEffect } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ── Config ────────────────────────────────────────
const CATEGORIES = [
  { key: 'kesehatan',       label: 'Kesehatan' },
  { key: 'bencana',         label: 'Bencana' },
  { key: 'duka',            label: 'Duka' },
  { key: 'anak_yatim',      label: 'Anak Yatim' },
  { key: 'lansia',          label: 'Lansia' },
  { key: 'hunian_darurat',  label: 'Hunian Darurat' },
];

const PROGRESS_RANGES = [
  { key: '',         label: 'Semua' },
  { key: '0-25',     label: '0-25%' },
  { key: '25-50',    label: '25-50%' },
  { key: '50-75',    label: '50-75%' },
  { key: '75-100',   label: '75-100%' },
];

const DEADLINE_RANGES = [
  { key: '',         label: 'Semua' },
  { key: 'expired',  label: 'Sudah Lewat' },
  { key: 'lt3',      label: '≤3 Hari' },
  { key: 'lt7',      label: '≤7 Hari' },
  { key: 'lt14',     label: '≤14 Hari' },
  { key: 'gt14',     label: '>14 Hari' },
  { key: 'none',     label: 'Tanpa Deadline' },
];

// ── Types ─────────────────────────────────────────
export interface FiltersState {
  categories: string[];     // cat=...,...
  urgent: boolean;          // urgent=1
  partner: string;          // partner=...
  progress: string;         // progress=0-25
  deadline: string;         // deadline=lt7
  dateFrom: string;         // from=YYYY-MM-DD
  dateTo: string;           // to=YYYY-MM-DD
}

export const EMPTY_FILTERS: FiltersState = {
  categories: [],
  urgent: false,
  partner: '',
  progress: '',
  deadline: '',
  dateFrom: '',
  dateTo: '',
};

/** Count active filters for badge */
export function countActiveFilters(f: FiltersState): number {
  let n = 0;
  if (f.categories.length > 0) n++;
  if (f.urgent) n++;
  if (f.partner.trim()) n++;
  if (f.progress) n++;
  if (f.deadline) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED FILTERS DRAWER
// ═══════════════════════════════════════════════════════════════

export default function AdvancedFiltersDrawer({
  open,
  filters,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  filters: FiltersState;
  onClose: () => void;
  onApply: (filters: FiltersState) => void;
  onReset: () => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const [draft, setDraft] = useState<FiltersState>(filters);

  // Sync draft when drawer opens or filters change externally
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  const toggleCategory = (cat: string) => {
    setDraft(d => ({
      ...d,
      categories: d.categories.includes(cat)
        ? d.categories.filter(c => c !== cat)
        : [...d.categories, cat],
    }));
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    onReset();
    onClose();
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

          {/* Kategori */}
          <FilterSection label="Kategori" t={t}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIES.map(cat => {
                const checked = draft.categories.includes(cat.key);
                return (
                  <label key={cat.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    border: `1px solid ${checked ? '#EC4899' : t.sidebarBorder}`,
                    background: checked ? 'rgba(236,72,153,0.08)' : t.mainBg,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat.key)}
                      style={{ cursor: 'pointer', accentColor: '#EC4899' }}
                    />
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: checked ? '#EC4899' : t.textPrimary,
                    }}>
                      {cat.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterSection>

          {/* Urgency */}
          <FilterSection label="Urgency" t={t}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${draft.urgent ? '#EF4444' : t.sidebarBorder}`,
              background: draft.urgent ? 'rgba(239,68,68,0.08)' : t.mainBg,
              cursor: 'pointer', transition: 'all 150ms',
            }}>
              <input
                type="checkbox"
                checked={draft.urgent}
                onChange={e => setDraft(d => ({ ...d, urgent: e.target.checked }))}
                style={{ cursor: 'pointer', accentColor: '#EF4444' }}
              />
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: draft.urgent ? '#EF4444' : t.textPrimary,
              }}>
                🔴 Urgent saja
              </span>
            </label>
          </FilterSection>

          {/* Partner */}
          <FilterSection label="Partner Komunitas" t={t}>
            <input
              type="text"
              placeholder="Nama partner..."
              value={draft.partner}
              onChange={e => setDraft(d => ({ ...d, partner: e.target.value }))}
              style={inputStyle(t)}
            />
          </FilterSection>

          {/* Progress Range */}
          <FilterSection label="Progress Terkumpul" t={t}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROGRESS_RANGES.map(range => {
                const active = draft.progress === range.key;
                return (
                  <button
                    key={range.key || 'all'}
                    onClick={() => setDraft(d => ({ ...d, progress: range.key }))}
                    style={pillStyle(t, active)}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {/* Deadline Range */}
          <FilterSection label="Deadline" t={t}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEADLINE_RANGES.map(range => {
                const active = draft.deadline === range.key;
                return (
                  <button
                    key={range.key || 'all'}
                    onClick={() => setDraft(d => ({ ...d, deadline: range.key }))}
                    style={pillStyle(t, active)}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {/* Date Range (Created At) */}
          <FilterSection label="Tanggal Dibuat" t={t}>
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
              Filter kampanye yang dibuat pada rentang tanggal ini.
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
