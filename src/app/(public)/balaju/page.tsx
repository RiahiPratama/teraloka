// src/app/(public)/balaju/page.tsx
// F7-1a — BALAJU rider entry. Server component tipis: metadata + render shell client.
// Pola sama BAKABAR (page server + shell client). Interaktif (peta, auth, polling)
// ada di BalajuEntry (client).

import { BalajuEntry } from './BalajuEntry';

export const metadata = {
  title: 'BALAJU — Ojek & Kurir Maluku Utara | TeraLoka',
  description:
    'Layanan ojek, kurir, dan mobil lokal Maluku Utara. Harga transparan, driver terdekat, cepat & aman.',
};

export default function BalajuPage() {
  return <BalajuEntry />;
}
