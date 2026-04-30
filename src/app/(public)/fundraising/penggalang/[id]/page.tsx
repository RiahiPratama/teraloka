import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';
import type { Metadata } from 'next';
import {
  ArrowLeft, ShieldCheck, HeartHandshake, Users,
  TrendingUp, FileText, Calendar, CheckCircle2, Clock,
} from 'lucide-react';
import CampaignCard from '../_components/CampaignCard';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('name')
    .eq('id', id)
    .single();
  if (!data) return { title: 'Penggalang tidak ditemukan' };
  return {
    title: `${data.name} — Profil Penggalang | BADONASI`,
    description: `Lihat track record dan kampanye yang digalang oleh ${data.name} di BADONASI TeraLoka.`,
  };
}

export default async function PenggalangProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Fetch creator ──────────────────────────────────────────────
  const { data: creator } = await supabase
    .from('users')
    .select('id, name, phone_verified, created_at')
    .eq('id', id)
    .single();

  if (!creator) notFound();

  // ── Fetch their public campaigns ───────────────────────────────
  const { data: campaigns } = await supabase
    .schema('funding')
    .from('campaigns')
    .select(`
      id, title, slug, category, cover_image_url,
      collected_amount, target_amount, donor_count,
      status, is_urgent, is_verified, deadline, created_at
    `)
    .eq('creator_id', id)
    .in('status', ['active', 'completed'])
    .order('status', { ascending: true })   // active first
    .order('created_at', { ascending: false });

  const camps = campaigns ?? [];

  // ── Fetch approved reports for their campaigns ─────────────────
  let approvedReports = 0;
  if (camps.length > 0) {
    const { count } = await supabase
      .schema('funding')
      .from('usage_reports')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', camps.map(c => c.id))
      .eq('status', 'approved');
    approvedReports = count ?? 0;
  }

  // ── Compute stats ──────────────────────────────────────────────
  const totalCollected    = camps.reduce((s, c) => s + Number(c.collected_amount || 0), 0);
  const activeCampaigns   = camps.filter(c => c.status === 'active').length;
  const completedCampaigns = camps.filter(c => c.status === 'completed').length;
  const totalDonors       = camps.reduce((s, c) => s + Number(c.donor_count || 0), 0);

  const joinedYear = new Date(creator.created_at).getFullYear();

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-12">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-[#EC4899]/10 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative mx-auto max-w-lg">
          <Link
            href="/fundraising"
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-5 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            Kembali ke BADONASI
          </Link>

          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white text-2xl font-extrabold">
                {creator.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest mb-1">
                BADONASI · Profil Penggalang
              </p>
              <h1 className="text-xl font-extrabold text-white leading-tight truncate">
                {creator.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {creator.phone_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={10} />
                    WA Verified
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-[#95d3ba]">
                  <Calendar size={10} />
                  Bergabung {joinedYear}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-10 relative z-10 space-y-4">

        {/* ── Stats Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-100">

            {/* Total Terkumpul */}
            <div className="p-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center mx-auto mb-2">
                <HeartHandshake size={16} className="text-[#EC4899]" />
              </div>
              <p className="text-xs font-extrabold text-[#003526] leading-tight">
                {formatRupiah(totalCollected)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total Terkumpul</p>
            </div>

            {/* Total Donatur */}
            <div className="p-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                <Users size={16} className="text-blue-500" />
              </div>
              <p className="text-lg font-extrabold text-gray-900 leading-tight">
                {totalDonors.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Donatur Terima</p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={12} className="text-[#EC4899]" />
              </div>
              <p className="text-base font-extrabold text-gray-900">{activeCampaigns}</p>
              <p className="text-[10px] text-gray-400">Aktif</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
              </div>
              <p className="text-base font-extrabold text-gray-900">{completedCampaigns}</p>
              <p className="text-[10px] text-gray-400">Selesai</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileText size={12} className="text-blue-500" />
              </div>
              <p className="text-base font-extrabold text-gray-900">{approvedReports}</p>
              <p className="text-[10px] text-gray-400">Laporan</p>
            </div>
          </div>
        </div>

        {/* ── Trust note ── */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex gap-2 items-start">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>{creator.name}</strong> adalah penggalang terverifikasi TeraLoka. Identitas WA sudah dikonfirmasi dan semua kampanye telah melalui proses review admin.
          </p>
        </div>

        {/* ── Kampanye ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Kampanye ({camps.length})
          </p>

          {camps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Clock size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 mb-1">Belum ada kampanye publik</p>
              <p className="text-xs text-gray-400">
                Kampanye akan muncul setelah disetujui admin TeraLoka.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {camps.map((c: any) => (
                <CampaignCard key={c.id} campaign={c} variant="row" />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
