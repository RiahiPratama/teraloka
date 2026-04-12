import Link from 'next/link';
import { searchListings } from '@/lib/engine/listing-engine';
import { formatRupiah } from '@/utils/format';

export const metadata = {
  title: 'Kendaraan — Rental & Jual | TeraLoka',
};

export default async function VehiclePage({
  searchParams,
}: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const params = await searchParams;
  let listings: any[] = [];
  try {
    const result = await searchListings({ type: 'kendaraan', search: params.q, transaction_type: params.type });
    listings = result.data;
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">Kendaraan</h1>
      <p className="text-sm text-gray-500">Rental & Jual Motor/Mobil</p>
      <div className="mt-3 flex gap-2">
        {['all', 'rental', 'jual'].map((t) => (
          <Link key={t} href={`/vehicle${t !== 'all' ? `?type=${t}` : ''}`}
            className={`rounded-full px-3 py-1.5 text-xs ${(params.type || 'all') === t ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'}`}>
            {t === 'all' ? 'Semua' : t === 'rental' ? 'Rental' : 'Dijual'}
          </Link>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">🏍️</p>
            <p className="mt-2 text-sm text-gray-500">Belum ada kendaraan.</p>
          </div>
        ) : listings.map((item: any) => (
          <Link key={item.id} href={`/vehicle/${item.slug}`} className="block rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-lg font-bold text-[#1B6B4A]">{formatRupiah(item.price)}{item.transaction_type === 'rental' ? '/hari' : ''}</p>
            <p className="text-xs text-gray-500">{item.vehicle_brand} {item.vehicle_year}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
