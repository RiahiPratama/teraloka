import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/utils/format';

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  let logs: any[] = [];
  let stats = { total: 0, sent: 0, failed: 0, delivered: 0 };

  try {
    const { data } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    logs = data ?? [];

    stats.total = logs.length;
    stats.sent = logs.filter((l: any) => l.status === 'sent').length;
    stats.failed = logs.filter((l: any) => l.status === 'failed').length;
    stats.delivered = logs.filter((l: any) => l.status === 'delivered').length;
  } catch {}

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">📲 WA Notification Monitor</h1>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-lg bg-green-50 p-2 text-center">
          <p className="text-lg font-bold text-green-700">{stats.sent}</p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-center">
          <p className="text-lg font-bold text-blue-700">{stats.delivered}</p>
          <p className="text-xs text-gray-500">Delivered</p>
        </div>
        <div className="rounded-lg bg-red-50 p-2 text-center">
          <p className="text-lg font-bold text-red-700">{stats.failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {logs.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada log notifikasi.</p>
          </div>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{log.phone}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  log.status === 'sent' ? 'bg-green-100 text-green-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100'
                }`}>{log.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{log.template} · {formatRelative(log.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
