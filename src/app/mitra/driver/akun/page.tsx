// src/app/mitra/driver/akun/page.tsx
// T2 (10 Jun 2026) — halaman akun driver. Client shell handle auth + fetch /driver/me.
import DriverAccountShell from './DriverAccountShell';

export const metadata = { title: 'Akun Driver · BALAJU' };

export default function Page() {
  return <DriverAccountShell />;
}
