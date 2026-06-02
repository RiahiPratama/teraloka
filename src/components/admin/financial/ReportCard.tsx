'use client';

/**
 * TeraLoka — ReportCard (wrapper collapsible buat laporan keuangan)
 * Sesi Financial PT (2 Jun 2026) · +download per-laporan (2 Jun)
 * ────────────────────────────────────────────────────────────────
 * Card laporan: tertutup default, klik header → body kebuka inline.
 * Header tetap nampilin angka kunci + badge walau tertutup (scannable).
 * Opsional: tombol download Excel/CSV per laporan (onDownload prop).
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ReportCardProps {
  icon:        React.ReactNode;
  title:       string;
  subtitle?:   string;
  summary?:    React.ReactNode;   // angka kunci + badge (kanan), tampil walau tertutup
  defaultOpen?: boolean;
  onDownload?: (format: 'xlsx' | 'csv') => Promise<void> | void;  // opsional: download per laporan
  children:    React.ReactNode;
}

export default function ReportCard({ icon, title, subtitle, summary, defaultOpen = false, onDownload, children }: ReportCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState<'xlsx' | 'csv' | null>(null);

  async function handleDownload(e: React.MouseEvent, format: 'xlsx' | 'csv') {
    e.stopPropagation();   // jangan toggle card
    if (!onDownload || busy) return;
    setBusy(format);
    try { await onDownload(format); } finally { setBusy(null); }
  }

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
        <div className="flex items-center gap-2.5 shrink-0">
          {summary && <div className="flex items-center gap-2.5">{summary}</div>}
          {onDownload && (
            <div className="flex items-center gap-1 ml-1 pl-2.5 border-l border-border">
              <span
                role="button"
                tabIndex={0}
                title="Download Excel (.xlsx)"
                onClick={(e) => handleDownload(e, 'xlsx')}
                className="p-1.5 rounded-md hover:bg-status-healthy/12 text-text-muted hover:text-status-healthy transition-colors cursor-pointer"
              >
                {busy === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              </span>
              <span
                role="button"
                tabIndex={0}
                title="Download CSV (.csv)"
                onClick={(e) => handleDownload(e, 'csv')}
                className="p-1.5 rounded-md hover:bg-ads/12 text-text-muted hover:text-ads transition-colors cursor-pointer"
              >
                {busy === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              </span>
            </div>
          )}
        </div>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
