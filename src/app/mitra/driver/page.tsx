// src/app/mitra/driver/page.tsx
// WAVE 1 — HOME driver BALAJU. Segmen mitra /mitra/driver.
// Render shell client yang handle auth + polling.
import { DriverHomeShell } from './DriverHomeShell';

export const metadata = {
  title: 'BALAJU Driver — TeraLoka',
};

export default function DriverHomePage() {
  return <DriverHomeShell />;
}
