import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';

export const metadata = {
  title: 'BAPASIAR Ferry — Jadwal Feri Lokal | TeraLoka',
};

export default async function FerryPage() {
  const supabase = await createClient();
  let schedules: any[] = [];

  try {
    const { data } = await supabase
      .from('ferry_schedules')
      .select('*, route:routes!route_id(origin:ports!origin_port_id(name), destination:ports!destination_port_id(name))')
      .eq('is_active', true)
      .order('departure_time');
    schedules = data ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAPASIAR Ferry</h1>
      <p className="text-sm text-gray-500">Jadwal feri lokal</p>

      <div className="mt-4 space-y-2">
        {schedules.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">⛴️</p>
            <p className="mt-2 text-sm text-gray-500">Jadwal feri akan segera tersedia.</p>
          </div>
        ) : schedules.map((s: any) => (
          <div key={s.id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-medium">
              {s.route?.origin?.name} → {s.route?.destination?.name}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
              <span>🕐 {s.departure_time}</span>
              <span>{s.vessel_name}</span>
              <span className="font-semibold text-[#1B6B4A]">{formatRupiah(s.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
