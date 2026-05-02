'use client';

// ════════════════════════════════════════════════════════════════
// MODAL CONTEXT
// ────────────────────────────────────────────────────────────────
// Global state untuk track berapa modal yang sedang open.
// Counter-based supaya handle nested modals dengan benar.
//
// Use case utama: BottomNav hide saat any modal open
//   → Tombol modal action (Lanjut/Batal) gak ketutup BottomNav.
//
// Pattern:
//   1. Modal: useModalRegister(isOpen)  ← one-line auto register/unregister
//   2. BottomNav: const { isAnyModalOpen } = useModal()
//
// Sengaja TIDAK auto-detect via document.body overflow karena:
//   - Explicit > implicit (testable, type-safe)
//   - Modal masa depan tidak harus lock body scroll
//
// Ditambah May 2, 2026 (Issue UX: Modal action button ketutup BottomNav)
// ════════════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface ModalContextValue {
  openCount: number;
  isAnyModalOpen: boolean;
  registerModal: () => void;
  unregisterModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const registerModal = useCallback(() => {
    setOpenCount((c) => c + 1);
  }, []);

  const unregisterModal = useCallback(() => {
    setOpenCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <ModalContext.Provider
      value={{
        openCount,
        isAnyModalOpen: openCount > 0,
        registerModal,
        unregisterModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

/**
 * Hook untuk akses modal state secara langsung.
 * Pakai ini di komponen yang perlu reaksi terhadap modal open
 * (contoh: BottomNav, FAB, persistent UI yang mau auto-hide).
 */
export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return ctx;
}

/**
 * Convenience hook untuk register/unregister modal otomatis
 * berdasarkan prop isOpen. One-liner di setiap modal component.
 *
 * Usage:
 *   function MyModal({ isOpen, onClose }) {
 *     useModalRegister(isOpen);
 *     if (!isOpen) return null;
 *     return <div>...</div>;
 *   }
 */
export function useModalRegister(isOpen: boolean) {
  const { registerModal, unregisterModal } = useModal();

  useEffect(() => {
    if (isOpen) {
      registerModal();
      return () => unregisterModal();
    }
    // Tidak open → no register, no cleanup
    return undefined;
  }, [isOpen, registerModal, unregisterModal]);
}
