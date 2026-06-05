// src/app/(public)/balaju/pesan/page.tsx
// Order flow BALAJU (form pesan). Dipindah dari /balaju — sekarang /balaju jadi LANDING.
// BalajuEntry sengaja TIDAK dimove (minim churn); cukup ubah importer-nya ke ../BalajuEntry.
// Status order tetap di /balaju/pesan/[id].

import { BalajuEntry } from '../BalajuEntry';

export const metadata = {
  title: 'Pesan BALAJU — Ojek & Kurir Maluku Utara | TeraLoka',
  description:
    'Pesan ojek atau kurir lokal Maluku Utara. Cek tarif transparan, pilih titik jemput & tujuan, driver terdekat.',
};

export default function BalajuPesanPage() {
  return <BalajuEntry />;
}
