// src/app/(public)/balaju/pesan/[id]/page.tsx
// F7-3a — route halaman status pesanan. Placeholder (diisi penuh di F7-3b:
// polling GET /rides/[id] + render per-state: cari driver / pilih penawaran /
// driver menuju / dalam perjalanan / selesai).

import { BalajuStatusShell } from './BalajuStatusShell';

export const metadata = {
  title: 'Status Pesanan — BALAJU | TeraLoka',
};

export default async function BalajuStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BalajuStatusShell rideId={id} />;
}
