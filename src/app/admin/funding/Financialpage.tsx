import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah, formatRelative } from '@/utils/format';

export default async function AdminFundingPage() {
  const supabase = await createClient();
  let campaigns: any[] = [];
  let pendingDonations: any[] = [];

  try {
    const { data: c } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(50);
    campaigns = c ?? [];
    const { data: d } = await supabase.from('donations').select('*, campaign:campaigns!campaign_id(title)').eq('verification_status', 'pending').order('created_at', { ascending: false }).limit(20);
    pendingDonations = d ?? [];
  } catch {}

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">💚 BASUMBANG Admin</h1>

      {pendingDonations.length > 0 && (
        <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
          ⚠️ {pendingDonations.length} donasi menunggu verifikasi transfer
        </div>
      )}

      <h2 className="mt-4 text-sm font-semibold">Campaigns ({campaigns.length})</h2>
      <div className="mt-2 space-y-2">
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada campaign.</p>
        ) : campaigns.map((c: any) => (
          <div key={c.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium">{c.title}</p>
              <span className={`rounded px-2 py-0.5 text-xs ${
                c.status === 'active' ? 'bg-green-100 text-green-700' :
                c.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100'
              }`}>{c.status}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formatRupiah(c.collected_amount)} / {formatRupiah(c.target_amount)} · {c.donor_count} donatur
            </p>
          </div>
        ))}
      </div>

      {pendingDonations.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold">Verifikasi Donasi</h2>
          <div className="mt-2 space-y-2">
            {pendingDonations.map((d: any) => (
              <div key={d.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm font-medium">{d.donor_name} → {d.campaign?.title}</p>
                <p className="text-xs text-gray-500">
                  {formatRupiah(d.amount)} + {formatRupiah(d.operational_fee)} fee · Kode: {d.donation_code}
                </p>
                <p className="text-xs text-gray-400">{formatRelative(d.created_at)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
