import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminTransportPage() {
  const supabase = await createClient();
  let stats = { operators: 0, departures_today: 0, total_passengers: 0 };

  try {
    const { count: ops } = await supabase.from('operators').select('id', { count: 'exact', head: true }).eq('is_active', true);
    stats.operators = ops ?? 0;

    const today = new Date().toISOString().split('T')[0];
    const { count: deps } = await supabase.from('departures').select('id', { count: 'exact', head: true }).gte('departed_at', today);
    stats.departures_today = deps ?? 0;
  } catch {}

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">🚤 Transport Admin</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">{stats.operators}</p>
          <p className="text-xs text-gray-500">Operator Aktif</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold">{stats.departures_today}</p>
          <p className="text-xs text-gray-500">Keberangkatan Hari Ini</p>
        </div>
      </div>
    </div>
  );
}
