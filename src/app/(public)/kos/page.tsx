import Link from 'next/link';
import { searchListings } from '@/lib/engine/listing-engine';
import { formatRupiah } from '@/utils/format';

export const metadata = {
  title: 'BAKOS — Cari Kos Ternate | TeraLoka',
  description: 'Cari kos-kosan di Ternate dan Maluku Utara.',
};

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: '0-500000', label: '< 500k' },
  { key: '500000-1000000', label: '500k-1jt' },
  { key: '1000000-99999999', label: '> 1jt' },
];

export default async function KosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [minStr, maxStr] = (params.filter || '').split('-');
  const minPrice = minStr ? Number(minStr) : undefined;
  const maxPrice = maxStr ? Number(maxStr) : undefined;

  let listings: any[] = [];
  let total = 0;
  try {
    const result = await searchListings({
      type: 'kos',
      search: params.q,
      minPrice,
      maxPrice,
      page: Number(params.page) || 1,
    });
    listings = result.data;
    total = result.total;
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAKOS</h1>
      <p className="text-sm text-gray-500">Cari kos di Ternate</p>

      {/* Search */}
      <form className="mt-3">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Cari kos..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
        />
      </form>

      {/* Price filter */}
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/kos${f.key !== 'all' ? `?filter=${f.key}` : ''}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
              (params.filter || 'all') === f.key ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Results */}
      <div className="mt-4 space-y-3">
        {listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">🏘️</p>
            <p className="mt-2 text-sm text-gray-500">Belum ada kos terdaftar.</p>
          </div>
        ) : (
          listings.map((item: any) => (
            <Link key={item.id} href={`/kos/${item.slug}`} className="block rounded-xl border border-gray-200 overflow-hidden active:bg-gray-50">
              {item.photos?.[0] && (
                <div className="h-40 bg-gray-200">
                  <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  {item.listing_tier === 'premium' && (
                    <span className="ml-2 shrink-0 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">⭐ PREMIUM</span>
                  )}
                </div>
                <p className="mt-1 text-lg font-bold text-[#1B6B4A]">
                  {formatRupiah(item.price)}<span className="text-xs font-normal text-gray-500">/bulan</span>
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {item.kos_type && <span>{item.kos_type}</span>}
                  {item.rating_avg > 0 && <span>⭐ {item.rating_avg}</span>}
                  <span>{item.address}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
