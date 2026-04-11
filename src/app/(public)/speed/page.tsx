import Link from 'next/link';
import { getAllPorts, getSpeedRoutes } from '@/lib/engine/booking-engine';
import { formatRupiah } from '@/utils/format';

export const metadata = {
  title: 'BAPASIAR Speed — Speed Boat Maluku Utara | TeraLoka',
  description: 'Informasi antrian dan jadwal speed boat di Maluku Utara.',
};

export default async function SpeedPage() {
  let ports: any[] = [];
  let routes: any[] = [];

  try {
    ports = await getAllPorts();
    routes = await getSpeedRoutes();
  } catch {}

  // Group ports by city
  const ternatePorts = ports.filter((p) => ['bastiong', 'mangga-dua', 'kota-baru', 'revolusi', 'dufa-dufa'].includes(p.slug));
  const otherPorts = ports.filter((p) => !['bastiong', 'mangga-dua', 'kota-baru', 'revolusi', 'dufa-dufa'].includes(p.slug));

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAPASIAR Speed</h1>
      <p className="text-sm text-gray-500">Antrian speed boat real-time</p>

      {/* Weather alert placeholder */}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        <span>🟢</span>
        <span>Cuaca aman — angin 8 knot, gelombang 0.5m</span>
      </div>

      {/* Ports - Ternate */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-gray-700">Pelabuhan Ternate</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ternatePorts.map((port) => (
            <Link
              key={port.id}
              href={`/speed/${port.slug}`}
              className="rounded-xl border border-gray-200 p-3 active:bg-gray-50"
            >
              <p className="font-medium text-sm">{port.name}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-lg">🚤</span>
                <span className="text-xs text-gray-500">
                  {port.active_queue > 0 ? `${port.active_queue} speed antri` : 'Tidak ada antrian'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Ports - Lainnya */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-gray-700">Pelabuhan Tujuan</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {otherPorts.map((port) => (
            <Link
              key={port.id}
              href={`/speed/${port.slug}`}
              className="rounded-xl border border-gray-200 p-3 active:bg-gray-50"
            >
              <p className="font-medium text-sm">{port.name}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-lg">🚤</span>
                <span className="text-xs text-gray-500">
                  {port.active_queue > 0 ? `${port.active_queue} speed antri` : 'Tidak ada antrian'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Routes & pricing */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">Rute & Harga</h2>
        <div className="mt-2 space-y-2">
          {routes.length === 0 ? (
            <p className="text-sm text-gray-400">Memuat rute...</p>
          ) : (
            routes.map((route: any) => (
              <div key={route.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <div className="text-sm">
                  <span className="font-medium">{route.origin?.name}</span>
                  <span className="text-gray-400"> → </span>
                  <span className="font-medium">{route.destination?.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#1B6B4A]">
                  {formatRupiah(route.base_price)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">ℹ️ Cara Naik Speed</p>
        <ol className="mt-2 space-y-1 text-xs">
          <li>1. Datang ke pelabuhan</li>
          <li>2. Speed paling depan diisi duluan</li>
          <li>3. Kalau penuh → berangkat!</li>
          <li>4. Bayar cash ke operator di atas speed</li>
        </ol>
      </div>
    </div>
  );
}
