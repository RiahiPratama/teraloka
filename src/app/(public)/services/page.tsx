import Link from 'next/link';
import { searchListings } from '@/lib/engine/listing-engine';
import { JASA_CATEGORY_LABELS } from '@/lib/domain/listing-rules';

export const metadata = {
  title: 'Jasa — Layanan di Maluku Utara | TeraLoka',
};

const CATEGORIES = [
  { key: 'all', label: 'Semua' },
  ...Object.entries(JASA_CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
];

export default async function ServicesPage({
  searchParams,
}: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const params = await searchParams;
  let listings: any[] = [];
  try {
    const result = await searchListings({
      type: 'jasa',
      search: params.q,
      category: params.cat !== 'all' ? params.cat : undefined,
    });
    listings = result.data;
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">Jasa</h1>
      <p className="text-sm text-gray-500">Layanan & jasa di Maluku Utara</p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={`/services${c.key !== 'all' ? `?cat=${c.key}` : ''}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${(params.cat || 'all') === c.key ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'}`}>
            {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">🔧</p>
            <p className="mt-2 text-sm text-gray-500">Belum ada provider jasa.</p>
          </div>
        ) : listings.map((item: any) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {JASA_CATEGORY_LABELS[item.service_category] || item.service_category}
                </p>
              </div>
              {item.source === 'edukazia' && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">via EduKazia</span>
              )}
            </div>
            {item.rating_avg > 0 && (
              <p className="mt-1 text-xs text-gray-500">⭐ {item.rating_avg} ({item.rating_count} review)</p>
            )}
            <button className="mt-2 w-full rounded-lg bg-[#1B6B4A] py-2 text-sm font-medium text-white">
              💬 Hubungi via TeraLoka
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
