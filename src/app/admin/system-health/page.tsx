import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/utils/format';

const SERVICES = ['supabase', 'vercel', 'upstash', 'fonnte', 'api'];

async function getHealthData() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('system_health_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // Group by service, get latest per service
  const latest: Record<string, any> = {};
  (data ?? []).forEach((snap: any) => {
    if (!latest[snap.service]) latest[snap.service] = snap;
  });

  return { snapshots: data ?? [], latest };
}

export default async function SystemHealthPage() {
  const { latest } = await getHealthData();

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">🖥️ System Health</h1>
      <p className="text-sm text-gray-500">Monitoring infrastruktur TeraLoka</p>

      <div className="mt-4 space-y-3">
        {SERVICES.map((service) => {
          const snap = latest[service];
          const status = snap?.status || 'unknown';
          const statusColor =
            status === 'healthy' ? 'bg-green-100 text-green-700' :
            status === 'degraded' ? 'bg-yellow-100 text-yellow-700' :
            status === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-500';
          const statusEmoji =
            status === 'healthy' ? '🟢' :
            status === 'degraded' ? '🟡' :
            status === 'down' ? '🔴' : '⚪';

          return (
            <div key={service} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{statusEmoji}</span>
                  <span className="font-medium capitalize">{service}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${statusColor}`}>
                  {status}
                </span>
              </div>
              {snap && (
                <div className="mt-2 text-xs text-gray-500">
                  {snap.response_time_ms && <span>Response: {snap.response_time_ms}ms · </span>}
                  <span>Updated: {formatRelative(snap.created_at)}</span>
                </div>
              )}
              {!snap && (
                <p className="mt-2 text-xs text-gray-400">Belum ada data monitoring</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          💡 Health check cron setiap 15 menit. Data retention 30 hari. Setup cron di FASE 5+.
        </p>
      </div>
    </div>
  );
}
