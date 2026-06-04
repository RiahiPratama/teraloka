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

// ─── Image Compression (Mobile-first + alpha-aware) ──────────────
//
// v4 (5 Jun 2026, WS-5c B-lite):
//   - MAX_DIMENSION 1920 → 1280 (cukup buat HP ~380px + desktop ~1000px;
//     separuh berat dari 1920). Mayoritas trafik BAKABAR = mobile.
//   - Output JPEG → WebP @ 0.85 (≈25-35% lebih kecil di kualitas setara;
//     semua browser 2026 support). LCP win.
//   - ALPHA-AWARE: PNG transparan (objek animasi AnimationBuilder, logo)
//     TIDAK dipaksa lossy — output PNG (resize only) supaya transparansi +
//     ketajaman tepi terjaga. Iklan = produk berbayar, kualitas dijaga.
//     Deteksi alpha cuma untuk source PNG/WebP (JPEG mustahil punya alpha →
//     skip scan, hemat). Foto (JPEG) langsung WebP.
//   - Skip threshold 500KB → 150KB (gambar 150-500KB ikut diproses; hero
//     299KB sebelumnya LOLOS tanpa di-resize — ini yg bikin LCP berat).
//   - GIF di-skip (animasi mati kalau lewat canvas) — defense in depth,
//     walau ImageUpload + VideoUpload sudah skip GIF sebelum manggil ini.
//
// PDF & non-image: skip, return original.
//
export async function compressImage(file: File): Promise<File> {
  // Skip non-image (PDF, dll)
  if (!file.type.startsWith('image/')) return file;

  // Skip GIF — canvas render = frame pertama saja → animasi hilang.
  if (file.type === 'image/gif') return file;

  // Skip if already small (< 150KB) — no need to compress
  if (file.size < 150 * 1024) return file;

  // Source yang MUNGKIN punya alpha = PNG / WebP. JPEG mustahil transparan.
  const mayHaveAlpha = file.type === 'image/png' || file.type === 'image/webp';

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const MAX_DIMENSION = 1280;
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

      // ── Deteksi transparansi (hanya untuk source PNG/WebP) ──────
      // Scan alpha channel; ketemu pixel < 255 → ada transparansi.
      // Early-break begitu nemu (cepat untuk gambar yang memang transparan).
      let hasAlpha = false;
      if (mayHaveAlpha) {
        try {
          const { data } = ctx.getImageData(0, 0, width, height);
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) { hasAlpha = true; break; }
          }
        } catch {
          // getImageData gagal (mis. tainted) → aman-kan: anggap punya alpha
          // supaya gak ngerusak transparansi yang mungkin ada.
          hasAlpha = true;
        }
      }

      // Transparan → PNG (lossless, jaga alpha + tepi). Selain itu → WebP 85%.
      const outType = hasAlpha ? 'image/png' : 'image/webp';
      const outExt  = hasAlpha ? 'png' : 'webp';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Guard: kalau hasil malah LEBIH besar dari asli (jarang, mis.
          // PNG flat kecil), pakai file asli — jangan rugi.
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const newFile = new File([blob], `${nameWithoutExt}.${outExt}`, {
            type: outType,
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        outType,
        hasAlpha ? undefined : 0.85, // quality hanya berlaku untuk WebP
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
