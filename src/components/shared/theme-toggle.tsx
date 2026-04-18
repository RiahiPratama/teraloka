'use client';

/**
 * TeraLoka — ThemeToggle
 * Phase 2 · Batch 2b — Theme Integration
 * ------------------------------------------------------------
 * Tombol toggle dark ↔ light dengan dua variant:
 * - 'icon' → square icon-only button (buat header kompakt)
 * - 'pill' → icon + label (gaya mirip toggle existing di admin layout)
 *
 * Contoh:
 *   <ThemeToggle />                     // default: icon, md
 *   <ThemeToggle variant="pill" />      // icon + label "Terang/Gelap"
 *   <ThemeToggle size="sm" />           // kecil (sidebar footer)
 *
 * Mounted guard:
 * Sebelum React hydrate, ThemeScript udah apply .dark class ke <html>,
 * tapi state React useTheme() belum sync — jadi icon bisa mismatch
 * sekejap. `mounted` state bikin kita render placeholder sampai
 * client-side state siap → zero flash.
 */

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'icon' | 'pill';

interface ThemeToggleProps {
  className?: string;
  size?: Size;
  variant?: Variant;
}

const ICON_SIZE_MAP: Record<Size, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const BUTTON_DIMS: Record<Size, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function ThemeToggle({
  className,
  size = 'md',
  variant = 'icon',
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  const iconSize = ICON_SIZE_MAP[size];

  // Pill variant — icon + label, mirip UX admin existing
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'border border-border bg-surface-muted',
          'text-xs font-semibold text-text-muted',
          'hover:bg-surface-elevated hover:text-text transition-colors',
          'cursor-pointer select-none',
          className
        )}
      >
        {mounted ? (
          <>
            {isDark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
            <span>{isDark ? 'Terang' : 'Gelap'}</span>
          </>
        ) : (
          // Placeholder saat SSR / pre-hydration — jaga ukuran stabil
          <span className="opacity-0">Theme</span>
        )}
      </button>
    );
  }

  // Icon-only variant — square button untuk header kompakt
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        BUTTON_DIMS[size],
        'border border-border bg-surface',
        'text-text-muted hover:text-text',
        'hover:bg-surface-muted transition-colors',
        'cursor-pointer',
        className
      )}
    >
      {mounted ? (
        isDark ? <Sun size={iconSize} /> : <Moon size={iconSize} />
      ) : null}
    </button>
  );
}
