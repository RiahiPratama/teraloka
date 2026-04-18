import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * TeraLoka — cn() utility
 * Phase 2 · Batch 1 — Design Foundation
 * ------------------------------------------------------------
 * Merge Tailwind classes dengan conflict resolution.
 * Pakai di setiap komponen UI untuk combine base classes + conditional
 * classes + className prop dari consumer.
 *
 * Contoh:
 *   cn('px-4 py-2', isActive && 'bg-primary', className)
 *   cn('px-2', 'px-4')  // → 'px-4' (conflict resolved, last wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
