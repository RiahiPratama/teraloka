// src/app/mitra/driver/order/[id]/page.tsx
// WAVE 2 — Layar order aktif driver. Next 16: params = Promise (wajib await).
import { DriverOrderShell } from './DriverOrderShell';

export const metadata = {
  title: 'Order Aktif — BALAJU Driver',
};

export default async function DriverOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverOrderShell rideId={id} />;
}
