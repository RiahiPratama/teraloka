// src/app/mitra/driver/layout.tsx
// T2 (10 Jun 2026) — layout bersama area driver. Render bottom nav persisten di semua halaman.
// Nav sembunyi sendiri di route fokus (order/[id], daftar) via pathname.
import DriverBottomNav from './DriverBottomNav';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DriverBottomNav />
    </>
  );
}
