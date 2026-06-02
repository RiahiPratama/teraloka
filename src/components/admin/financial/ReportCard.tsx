'use client';

/**
 * TeraLoka — ReportCard (wrapper collapsible buat laporan keuangan)
 * Sesi Financial PT (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Card laporan: tertutup default, klik header → body kebuka inline.
 * Header tetap nampilin angka kunci + badge walau tertutup (scannable).
 * Independen (bebas buka berapa pun). Dipakai semua section laporan PT.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface ReportCardProps {
  icon:        React.ReactNode;
  title:       string;
  subtitle?:   string;
  summary?:    React.ReactNode;   // angka kunci + badge (kanan), tampil walau tertutup
  defaultOpen?: boolean;
  children:    React.ReactNode;
}

export default function ReportCard({ icon, title, subtitle, summary, defaultOpen = false, children }: ReportCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-[18px] py-3.5 text-left hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ChevronDown className={cn('w-4 h-4 text-text-muted shrink-0 transition-transform duration-200', open && 'rotate-180')} />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-text flex items-center gap-1.5">{icon} {title}</p>
            {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {summary && <div className="flex items-center gap-2.5 shrink-0">{summary}</div>}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
