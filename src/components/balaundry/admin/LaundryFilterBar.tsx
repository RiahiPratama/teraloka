'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — LaundryFilterBar
// PATH: src/components/balaundry/admin/LaundryFilterBar.tsx
// Filter dikirim ke BE (verified/active/q) — JANGAN filter di FE.
// q di-debounce di parent. Material Symbols + util *-balaundry.
// ════════════════════════════════════════════════════════════════
import { cn } from '@/lib/utils';

export type TriFilter = 'all' | 'true' | 'false';

interface SegOption {
  value: TriFilter;
  label: string;
}

interface LaundryFilterBarProps {
  verified: TriFilter;
  active: TriFilter;
  q: string;
  onVerifiedChange: (v: TriFilter) => void;
  onActiveChange: (v: TriFilter) => void;
  onQChange: (v: string) => void;
}

const VERIFIED_OPTS: SegOption[] = [
  { value: 'all', label: 'Semua' },
  { value: 'false', label: 'Pending' },
  { value: 'true', label: 'Terverifikasi' },
];

const ACTIVE_OPTS: SegOption[] = [
  { value: 'all', label: 'Semua' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TriFilter;
  options: SegOption[];
  onChange: (v: TriFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
        {label}
      </span>
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'bg-balaundry text-white'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LaundryFilterBar({
  verified,
  active,
  q,
  onVerifiedChange,
  onActiveChange,
  onQChange,
}: LaundryFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1 sm:min-w-[240px] sm:flex-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
          Cari
        </span>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-text-subtle">
            search
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Nama atau display ID…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors focus:border-balaundry"
          />
        </div>
      </div>
      <Segmented label="Verifikasi" value={verified} options={VERIFIED_OPTS} onChange={onVerifiedChange} />
      <Segmented label="Status" value={active} options={ACTIVE_OPTS} onChange={onActiveChange} />
    </div>
  );
}
