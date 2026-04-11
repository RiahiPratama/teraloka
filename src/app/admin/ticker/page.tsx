import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TICKER_PRIORITY } from '@/utils/constants';
import { formatRelative } from '@/utils/format';

export default async function AdminTickerPage() {
  const supabase = await createClient();
  let items: any[] = [];

  try {
    const { data } = await supabase
      .from('ticker_items')
      .select('*')
      .order('is_active', { ascending: false })
      .order('priority', { ascending: true })
      .limit(50);
    items = data ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">📢 News Ticker</h1>

      <div className="mt-2 text-xs text-gray-500">
        Priority: 🔴darurat 🔵kemanusiaan 🟡breaking 🟢transport ⚪promo
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada ticker. Akan auto-generate dari services.</p>
          </div>
        ) : (
          items.map((item: any) => {
            const config = TICKER_PRIORITY[item.priority as keyof typeof TICKER_PRIORITY];
            return (
              <div key={item.id} className={`rounded-lg border p-3 ${item.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <span>{config?.emoji}</span>
                  <span className="flex-1 text-sm">{item.text}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_active ? 'aktif' : 'nonaktif'}
                  </span>
                </div>
                {item.expires_at && (
                  <p className="mt-1 text-xs text-gray-400">Expires: {formatRelative(item.expires_at)}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
