import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah, formatDate } from '@/utils/format';

export const metadata = {
  title: 'BAPASIAR Kapal Lokal — Kapal Penumpang Maluku Utara | TeraLoka',
  description: 'Jadwal dan booking kapal penumpang overnight di Maluku Utara.',
};

export default async function ShipPage() {
  const supabase = await createClient();
  let routes: any[] = [];
  let schedules: any[] = [];

  try {
    const { data: r } = await supabase.from('ship_routes').select('*').eq('is_active', true);
    routes = r ?? [];
    const { data: s } = await supabase
      .from('ship_schedules')
      .select('*, route:ship_routes!ship_route_id(name), vessel:ship_vessels!vessel_id(name)')
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .order('departure_date')
      .limit(20);
    schedules = s ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAPASIAR Kapal Lokal</h1>
      <p className="text-sm text-gray-500">Kapal penumpang overnight Maluku Utara</p>

      {/* Routes */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold">Rute Tersedia</h2>
        <div className="mt-2 space-y-2">
          {routes.length === 0 ? (
            <p className="text-sm text-gray-400">Memuat rute...</p>
          ) : routes.map((route: any) => (
            <div key={route.id} className="rounded-xl border border-gray-200 p-3">
              <p className="font-medium text-sm">🚢 {route.name}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span>Ranjang: {formatRupiah(route.base_price_bed)}</span>
                {route.base_price_cabin && <span>Kamar ABK: {formatRupiah(route.base_price_cabin)}</span>}
              </div>
              <p className="mt-1 text-xs text-gray-400">{route.frequency}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming schedules */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold">Jadwal Mendatang</h2>
        <div className="mt-2 space-y-2">
          {schedules.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-500">Belum ada jadwal. Data akan diupdate oleh admin.</p>
            </div>
          ) : schedules.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{s.route?.name}</p>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  s.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  s.status === 'boarding' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100'
                }`}>{s.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {s.vessel?.name} · {formatDate(s.departure_date)} {s.departure_time || ''}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Ranjang: {s.available_beds ?? '?'} tersisa · Kamar: {s.available_cabins ?? '?'} tersisa
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Safety info */}
      <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">⚠️ Keselamatan</p>
        <p className="mt-1 text-xs">Semua penumpang WAJIB tercatat di manifest digital untuk keselamatan SAR. Booking via TeraLoka = tercatat otomatis.</p>
      </div>
    </div>
  );
}
