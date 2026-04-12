import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminListingsPage() {
  const supabase = await createClient();
  let stats = { kos: 0, properti: 0, kendaraan: 0, jasa: 0 };

  try {
    for (const type of ['kos', 'properti', 'kendaraan', 'jasa'] as const) {
      const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('type', type);
      stats[type] = count ?? 0;
    }
  } catch {}

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">🏘️ Listing Admin</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {Object.entries(stats).map(([type, count]) => (
          <div key={type} className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-gray-500 capitalize">{type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
