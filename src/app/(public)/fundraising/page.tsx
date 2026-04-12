import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';

export const metadata = {
  title: 'BASUMBANG — Galang Dana Kemanusiaan | TeraLoka',
  description: 'Galang dana kemanusiaan untuk warga Maluku Utara.',
};

const CATEGORIES = [
  { key: 'all', label: 'Semua', emoji: '💚' },
  { key: 'kesehatan', label: 'Kesehatan', emoji: '🏥' },
  { key: 'bencana', label: 'Bencana', emoji: '🌊' },
  { key: 'duka', label: 'Duka', emoji: '🕊️' },
  { key: 'anak_yatim', label: 'Anak Yatim', emoji: '👶' },
  { key: 'lansia', label: 'Lansia', emoji: '👴' },
  { key: 'hunian_darurat', label: 'Hunian Darurat', emoji: '🏚️' },
];

export default async function FundraisingPage({
  searchParams,
}: { searchParams: Promise<{ cat?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let campaigns: any[] = [];

  try {
    let query = supabase
      .from('campaigns')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.cat && params.cat !== 'all') {
      query = query.eq('category', params.cat);
    }

    const { data } = await query;
    campaigns = data ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BASUMBANG</h1>
      <p className="text-sm text-gray-500">Galang dana kemanusiaan Maluku Utara</p>

      {/* Warning */}
      <div className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-700">
        💚 100% donasi sampai ke penerima. Biaya operasional ditambahkan donatur secara sukarela.
      </div>

      {/* Categories */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={`/fundraising${c.key !== 'all' ? `?cat=${c.key}` : ''}`}
            className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
              (params.cat || 'all') === c.key ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'
            }`}>
            <span>{c.emoji}</span><span>{c.label}</span>
          </Link>
        ))}
      </div>

      {/* Campaigns */}
      <div className="mt-4 space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">💚</p>
            <p className="mt-2 text-sm text-gray-500">Belum ada campaign aktif.</p>
          </div>
        ) : campaigns.map((c: any) => {
          const progress = c.target_amount > 0 ? Math.min((c.collected_amount / c.target_amount) * 100, 100) : 0;
          return (
            <Link key={c.id} href={`/fundraising/${c.slug}`} className="block rounded-xl border border-gray-200 overflow-hidden">
              {c.cover_image_url && (
                <div className="h-40 bg-gray-200">
                  <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-3">
                {c.is_urgent && (
                  <span className="mb-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">🔴 URGENT</span>
                )}
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-gray-500">{c.beneficiary_name}</p>

                {/* Progress bar */}
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-[#1B6B4A]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1B6B4A]">{formatRupiah(c.collected_amount)}</span>
                  <span className="text-gray-400">dari {formatRupiah(c.target_amount)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{c.donor_count} donatur</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
