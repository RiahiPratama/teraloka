import { createClient } from '@/lib/supabase/server';
import { formatRupiah, formatDate } from '@/utils/format';

export const metadata = {
  title: 'BAPASIAR Pelni — Jadwal Pelni | TeraLoka',
};

export default async function PelniPage() {
  const supabase = await createClient();
  let schedules: any[] = [];

  try {
    const { data } = await supabase
      .from('pelni_schedules')
      .select('*')
      .eq('is_active', true)
      .order('departure_date');
    schedules = data ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAPASIAR Pelni</h1>
      <p className="text-sm text-gray-500">Jadwal kapal Pelni dari/ke Maluku Utara</p>

      <div className="mt-4 space-y-3">
        {schedules.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">🛳️</p>
            <p className="mt-2 text-sm text-gray-500">Jadwal Pelni akan segera tersedia.</p>
            <p className="mt-1 text-xs text-gray-400">Cek jadwal resmi di pelni.co.id</p>
          </div>
        ) : schedules.map((s: any) => (
          <div key={s.id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-medium">🛳️ {s.ship_name}</p>
            <p className="mt-1 text-sm">{s.origin_port} → {s.destination_port}</p>
            {s.stops?.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">Via: {s.stops.join(' → ')}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              {s.departure_date && <span>📅 {formatDate(s.departure_date)}</span>}
              {s.departure_time && <span>🕐 {s.departure_time}</span>}
            </div>
            {s.classes && (
              <div className="mt-2 flex gap-2">
                {(s.classes as any[]).map((cls: any, i: number) => (
                  <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {cls.name}: {formatRupiah(cls.price)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
