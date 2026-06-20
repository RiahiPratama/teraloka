'use client';

// ════════════════════════════════════════════════════════════════
// SOS LIFT — context ringan biar SosFab naik di atas sticky save bar.
// Pola ikut ModalProvider (SosFab sudah di provider tree yg sama).
// Halaman dgn save bar panggil useSosLift() (default true) → SosFab naik;
// cleanup saat unmount → SOS balik ke posisi normal (jangan nyangkut).
// ════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const SosLiftContext = createContext<{ lifted: boolean; setLifted: (v: boolean) => void }>({
  lifted: false,
  setLifted: () => {},
});

export function SosLiftProvider({ children }: { children: ReactNode }) {
  const [lifted, setLifted] = useState(false);
  return <SosLiftContext.Provider value={{ lifted, setLifted }}>{children}</SosLiftContext.Provider>;
}

/** Dibaca SosFab — true = naik di atas save bar. */
export function useSosLiftValue() {
  return useContext(SosLiftContext).lifted;
}

/** Dipanggil halaman ber-save-bar. Auto-set saat mount, CLEANUP saat unmount. */
export function useSosLift(active = true) {
  const { setLifted } = useContext(SosLiftContext);
  useEffect(() => {
    if (!active) return;
    setLifted(true);
    return () => setLifted(false);
  }, [active, setLifted]);
}
