import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah, formatDate } from '@/utils/format';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('campaigns').select('title, description').eq('slug', slug).single();
  if (!data) return { title: 'Campaign tidak ditemukan' };
  return { title: `${data.title} | BASUMBANG`, description: data.description };
}

export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Get verified donations (non-anonymous)
  let donors: any[] = [];
  try {
    const { data } = await supabase
      .from('donations')
      .select('donor_name, amount, is_anonymous, created_at')
      .eq('campaign_id', campaign.id)
      .eq('verification_status', 'verified')
      .order('created_at', { ascending: false })
      .limit(20);
    donors = data ?? [];
  } catch {}

  // Get usage reports
  let reports: any[] = [];
  try {
    const { data } = await supabase
      .from('usage_reports')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'approved')
      .order('report_number');
    reports = data ?? [];
  } catch {}

  const progress = campaign.target_amount > 0 ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100) : 0;

  return (
    <div className="px-4 py-4">
      <Link href="/fundraising" className="text-sm text-[#1B6B4A]">← Semua Campaign</Link>

      {campaign.cover_image_url && (
        <div className="mt-3 overflow-hidden rounded-xl">
          <img src={campaign.cover_image_url} alt="" className="w-full" />
        </div>
      )}

      <h1 className="mt-3 text-xl font-bold">{campaign.title}</h1>
      <p className="mt-1 text-sm text-gray-500">Untuk: {campaign.beneficiary_name}</p>

      {/* Progress */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4">
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div className="h-3 rounded-full bg-[#1B6B4A]" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between">
          <div>
            <p className="text-lg font-bold text-[#1B6B4A]">{formatRupiah(campaign.collected_amount)}</p>
            <p className="text-xs text-gray-500">terkumpul</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatRupiah(campaign.target_amount)}</p>
            <p className="text-xs text-gray-500">target</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">{campaign.donor_count} donatur</p>
      </div>

      {/* Donate button */}
      {campaign.status === 'active' && (
        <button className="mt-4 w-full rounded-xl bg-[#1B6B4A] py-3.5 text-sm font-bold text-white">
          💚 Donasi Sekarang
        </button>
      )}

      {/* Description */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold">Deskripsi</h2>
        <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{campaign.description}</p>
      </div>

      {/* Donor list */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold">Donatur ({donors.length})</h2>
        <div className="mt-2 space-y-2">
          {donors.map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span>{d.is_anonymous ? 'Hamba Allah' : d.donor_name}</span>
              <span className="font-medium">{formatRupiah(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage reports (transparansi) */}
      {reports.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Laporan Penggunaan Dana</h2>
          <div className="mt-2 space-y-2">
            {reports.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-medium">Laporan #{r.report_number}: {r.title}</p>
                <p className="mt-1 text-xs text-gray-500">{r.description}</p>
                <p className="mt-1 text-xs font-semibold">Digunakan: {formatRupiah(r.amount_used)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transparansi info */}
      <div className="mt-6 rounded-xl bg-green-50 p-4 text-xs text-green-700">
        <p className="font-medium">💚 Transparansi BASUMBANG</p>
        <ul className="mt-1 space-y-0.5">
          <li>• 100% donasi sampai ke penerima</li>
          <li>• Rekening terpisah "TeraLoka BASUMBANG"</li>
          <li>• Laporan penggunaan wajib dalam 7 hari</li>
          <li>• Semua bukti transfer publik</li>
        </ul>
      </div>
    </div>
  );
}
