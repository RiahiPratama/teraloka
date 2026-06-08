// src/app/mitra/driver/daftar/page.tsx
// Pendaftaran driver BALAJU. Page tipis (server) — render shell client.
// Mirror pola DriverHomePage (page.tsx + DriverHomeShell).
import { DriverApplyShell } from './DriverApplyShell';

export const metadata = {
  title: 'Daftar Jadi Driver — BALAJU TeraLoka',
};

export default function DriverApplyPage() {
  return <DriverApplyShell />;
}
