'use client';

/**
 * TeraLoka — SidebarSearch
 * Phase 2 · Batch 5a — Layout Shell
 * ------------------------------------------------------------
 * Trigger search global (⌘K / Ctrl+K). Versi Batch 5a: visual saja,
 * belum function — onClick handler akan di-wire ke actual command palette
 * di Phase 3+ (Session 10+).
 *
 * Visual:
 * - Button dengan search icon, placeholder "Cari...", dan kbd hint
 * - Hover state lebih terang
 * - Keyboard shortcut (⌘K di Mac, Ctrl+K di Windows/Linux) detect otomatis
 *
 * Contoh:
 *   <SidebarSearch onClick={openCommandPalette} />
 *
 *   // Dengan shortcut binding di parent (opsional)
 *   useEffect(() => {
 *     const handler = (e) => {
 *       if ((e.metaKey || e.ctrlKey) && e.key === 'k') openPalette();
 *     };
 *     window.addEventListener('keydown', handler);
 *     return () => window.removeEventListener('keydown', handler);
 *   }, []);
 */

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarSearchProps {
  onClick?: () => void;
  placeholder?: string;
  className?: string;
}

export function SidebarSearch({
  onClick,
  placeholder = 'Cari...',
  className,
}: SidebarSearchProps) {
  const [isMac, setIsMac] = useState(false);

  // Detect platform untuk show ⌘ vs Ctrl
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const platform = navigator.platform ?? '';
    const ua = navigator.userAgent ?? '';
    setIsMac(
      platform.toUpperCase().includes('MAC') ||
        /Mac|iPhone|iPad/i.test(ua)
    );
  }, []);

  return (
    <div className={cn('shrink-0 px-3 pt-3', className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label="Buka pencarian global"
        className={cn(
          'group flex items-center gap-2 w-full',
          'px-3 py-2 rounded-lg',
          'bg-white/[0.05] hover:bg-white/[0.08]',
          'border border-white/[0.06] hover:border-white/[0.12]',
          'text-left transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-brand-teal-mint/50'
        )}
      >
        <Search
          size={14}
          className="shrink-0 text-white/50 group-hover:text-white/70"
        />
        <span className="flex-1 min-w-0 text-[12px] text-white/50 group-hover:text-white/70 truncate">
          {placeholder}
        </span>
        <kbd
          className={cn(
            'hidden sm:inline-flex items-center gap-0.5 shrink-0',
            'text-[10px] font-mono font-semibold text-white/60',
            'px-1.5 py-0.5 rounded',
            'bg-white/[0.05] border border-white/[0.08]'
          )}
        >
          <span aria-hidden="true">{isMac ? '⌘' : 'Ctrl'}</span>
          <span>K</span>
        </kbd>
      </button>
    </div>
  );
}
