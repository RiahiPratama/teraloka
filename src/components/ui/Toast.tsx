'use client';

// ════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ────────────────────────────────────────────────────────────────
// Replace alert()/confirm() yang jelek di mobile.
// - Bottom position (mobile-friendly, dekat tombol aksi)
// - Swipe-to-dismiss
// - Auto-dismiss
// - Variants: success, error, warning, info
// - Haptic feedback on show
//
// Usage:
//   1. Wrap app dengan <ToastProvider> di root layout
//   2. Pakai hook: const { toast } = useToast();
//      toast.success('Berhasil!');
//      toast.error('Gagal: ...');
// ════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { triggerHaptic } from '@/utils/pwa-utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error:   (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info:    (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<ToastVariant, { color: string; bg: string; border: string; icon: any; haptic: any }> = {
  success: { color: '#047857', bg: '#D1FAE5', border: '#A7F3D0', icon: CheckCircle2, haptic: 'success' },
  error:   { color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA', icon: XCircle,      haptic: 'error'   },
  warning: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', icon: AlertTriangle, haptic: 'warning' },
  info:    { color: '#1E40AF', bg: '#DBEAFE', border: '#BFDBFE', icon: Info,         haptic: 'tap'     },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((variant: ToastVariant, message: string, duration: number = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant, duration }]);
    triggerHaptic(VARIANT_META[variant].haptic);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const value: ToastContextValue = {
    toast: {
      success: (msg, dur) => showToast('success', msg, dur),
      error:   (msg, dur) => showToast('error', msg, dur ?? 5000),
      warning: (msg, dur) => showToast('warning', msg, dur ?? 4000),
      info:    (msg, dur) => showToast('info', msg, dur),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback graceful: kalau provider belum ter-mount, pakai console
    return {
      toast: {
        success: (msg) => console.log('[Toast Success]', msg),
        error:   (msg) => console.error('[Toast Error]', msg),
        warning: (msg) => console.warn('[Toast Warning]', msg),
        info:    (msg) => console.info('[Toast Info]', msg),
      },
    };
  }
  return ctx;
}

// ─── Toast container (renders all active toasts) ────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', // di atas bottom nav
      }}
    >
      <div className="flex flex-col items-center gap-2 px-4">
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── Single toast card with swipe-to-dismiss ───────────────────

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const meta = VARIANT_META[toast.variant];
  const Icon = meta.icon;
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    setStartX(e.touches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX === null) return;
    const diff = e.touches[0].clientX - startX;
    setTranslateX(diff);
  }

  function handleTouchEnd() {
    if (Math.abs(translateX) > 100) {
      setExiting(true);
      setTimeout(onDismiss, 200);
    } else {
      setTranslateX(0);
    }
    setStartX(null);
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onDismiss}
      className="pointer-events-auto w-full max-w-md rounded-xl shadow-lg flex items-start gap-3 p-3 cursor-pointer"
      style={{
        backgroundColor: meta.bg,
        borderLeft: `4px solid ${meta.color}`,
        border: `1px solid ${meta.border}`,
        transform: `translateX(${translateX}px) ${exiting ? 'scale(0.9)' : ''}`,
        opacity: exiting ? 0 : Math.max(0.3, 1 - Math.abs(translateX) / 200),
        transition: startX === null ? 'all 0.2s ease-out' : 'none',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Icon size={18} style={{ color: meta.color }} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium leading-snug" style={{ color: meta.color }}>
        {toast.message}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5"
        aria-label="Tutup"
      >
        <X size={14} style={{ color: meta.color, opacity: 0.7 }} />
      </button>

      {/* Inline keyframes for slideUp animation */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
