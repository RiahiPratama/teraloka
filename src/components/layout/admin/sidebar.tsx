'use client';

/**
 * TeraLoka — Sidebar (container)
 * Phase 2 · Batch 5a — Layout Shell
 * ------------------------------------------------------------
 * Container sidebar admin. Tugasnya:
 * - Background dark teal (konsisten light/dark mode)
 * - Fixed width 256px desktop
 * - Responsive: jadi drawer di mobile (< 768px)
 * - Scrollable area untuk nav panjang
 * - Backdrop overlay saat drawer open di mobile
 *
 * Struktur children (dikomposisi di AdminLayout Batch 5c):
 *   <Sidebar isOpen={sidebarOpen} onClose={closeSidebar}>
 *     <SidebarBrand />
 *     <SidebarSearch />
 *     <SidebarMissionControl />
 *     <SidebarNav ... />         ← Batch 5b
 *     <SidebarProfile ... />     ← Batch 5c
 *   </Sidebar>
 *
 * Note: Tidak self-contained — expect consumer me-manage state
 * `isOpen` dan `onClose` dari parent layout.
 */

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SidebarProps {
  children: ReactNode;
  /** State buka/tutup drawer (hanya relevan di mobile) */
  isOpen?: boolean;
  /** Callback saat drawer ditutup via backdrop atau Esc */
  onClose?: () => void;
  /** Width sidebar desktop (px). Default 256 sesuai mockup. */
  width?: number;
  className?: string;
}

export function Sidebar({
  children,
  isOpen = false,
  onClose,
  width = 256,
  className,
}: SidebarProps) {
  // Esc key tutup drawer di mobile
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock saat drawer open di mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop — mobile only, muncul saat drawer open */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className={cn(
            'fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]',
            'md:hidden'
          )}
        />
      )}

      {/* Sidebar container */}
      <aside
        style={{ width: `${width}px` }}
        className={cn(
          // Base
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col',
          'bg-brand-sidebar text-white',
          'border-r border-white/[0.06]',
          'overflow-hidden', // container tidak scroll, child yang scroll
          // Desktop: always visible
          'md:translate-x-0',
          // Mobile: slide-in drawer
          'transition-transform duration-250 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className
        )}
        aria-label="Admin navigation"
      >
        {children}
      </aside>
    </>
  );
}

/* ─── Sub-part: scrollable section dalam sidebar ─── */

/**
 * Wrapper untuk bagian sidebar yang bisa scroll (biasanya nav).
 * Dipakai di antara bagian fixed atas (brand, search, mission control)
 * dan fixed bawah (profile).
 */
export function SidebarScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-auto overflow-x-hidden',
        // Custom scrollbar — halus di dark bg
        '[&::-webkit-scrollbar]:w-1',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:bg-white/10',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        'hover:[&::-webkit-scrollbar-thumb]:bg-white/20',
        className
      )}
    >
      {children}
    </div>
  );
}
