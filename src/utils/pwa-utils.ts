// ════════════════════════════════════════════════════════════════
// PWA UTILITIES
// ────────────────────────────────────────────────────────────────
// Helper functions untuk PWA-like experience:
//   - compressImage(): Canvas-based image compression
//   - triggerHaptic(): Wrapper Vibration API
//   - isMobile(): UA detection
//   - useKeyboardOpen(): Detect virtual keyboard di mobile
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

// ─── Image Compression (Balanced quality) ───────────────────────
//
// Strategy: max 1920px (long edge), JPEG 85% quality
// Result: 5MB photo → ~500-700KB, text masih readable
// PDF & non-image: skip compression, return original
//
export async function compressImage(file: File): Promise<File> {
  // Skip non-image (PDF, dll)
  if (!file.type.startsWith('image/')) return file;

  // Skip if already small (< 500KB) — no need to compress
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const MAX_DIMENSION = 1920;
      let { width, height } = img;

      // Resize if needed (preserve aspect ratio)
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Preserve original filename, change extension to .jpg
          const ext = 'jpg';
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const newFile = new File([blob], `${nameWithoutExt}.${ext}`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        'image/jpeg',
        0.85, // 85% quality
      );
    };

    img.onerror = () => resolve(file); // Fallback if load fails
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ─── Haptic Feedback ────────────────────────────────────────────

type HapticType = 'success' | 'error' | 'warning' | 'tap';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  tap:     10,
  success: [15, 50, 15],
  warning: [30, 50, 30],
  error:   [50, 100, 50],
};

export function triggerHaptic(type: HapticType = 'tap'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[type]);
  } catch {
    // Silently fail — haptic is enhancement, not critical
  }
}

// ─── Mobile Detection ───────────────────────────────────────────
//
// Returns true for touch-primary devices
//
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── Detect virtual keyboard open ───────────────────────────────
//
// Hook untuk detect kapan virtual keyboard muncul (mobile)
// Strategy: Visual Viewport API (modern) + window.innerHeight fallback
//
export function useKeyboardOpen(): boolean {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Modern: Visual Viewport API
    if ('visualViewport' in window && window.visualViewport) {
      const vv = window.visualViewport;
      const handler = () => {
        // Threshold: keyboard usually takes 30%+ of viewport height
        const threshold = window.innerHeight * 0.7;
        setIsOpen(vv.height < threshold);
      };
      vv.addEventListener('resize', handler);
      handler(); // Initial check
      return () => vv.removeEventListener('resize', handler);
    }

    // Fallback: focus/blur on inputs
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        setIsOpen(true);
      }
    };
    const handleBlur = () => setIsOpen(false);

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return isOpen;
}

// ─── Format file size for human reading ─────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
