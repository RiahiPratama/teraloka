import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatRupiah } from '@/utils/format';
import type { Metadata } from 'next';
import {
  ArrowLeft, ShieldCheck, Clock, Users, Target,
  CheckCircle2, Building2, HeartHandshake, MessageCircle,
  Flame, Siren, FileCheck, UserCheck, Flag,
  ImageIcon, Lock, Share2, Megaphone, Wallet,
  Receipt, ArrowRight, Heart, TrendingUp,
  CircleDollarSign, Banknote, ShoppingBag, PlayCircle,
  PartyPopper, Activity,
} from 'lucide-react';
import ShareBar from './_components/ShareBar';
import AamiinButton from './_components/AamiinButton';
import UpdateAamiinButton from './_components/UpdateAamiinButton';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

// ════════════════════════════════════════════════════════════════
// Backend API config
// ────────────────────────────────────────────────────────────────
// Filosofi LOCKED (May 1, 2026):
//   "Backend adalah Otak, Database hanyalah Memori"
// Public page TIDAK BOLEH query Supabase langsung.
// Semua data via backend Hono API yang pakai service_role.
// ════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  kesehatan:      { label: 'Kesehatan',      color: '#D85A30' },
  bencana:        { label: 'Bencana Alam',   color: '#378ADD' },
  duka:           { label: 'Duka / Musibah', color: '#888780' },
  anak_yatim:     { label: 'Anak Yatim',     color: '#E8963A' },
  lansia:         { label: 'Lansia',         color: '#BA7517' },
  hunian_darurat: { label: 'Hunian Darurat', color: '#0891B2' },
};

function relativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} minggu lalu`;
  return then.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 8) return '****';
  return phone.slice(0, 4) + '*'.repeat(phone.length - 8) + phone.slice(-4);
}

function formatVerifyDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatLongDate(date: string | Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(date: string | Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ════════════════════════════════════════════════════════════════
// Backend fetch helpers
// ────────────────────────────────────────────────────────────────
// Both helpers handle errors gracefully:
//   - Network failures → log + return null/fallback
//   - 404 from backend → return null (caller handles notFound)
//   - Server errors → log + return null
// Pattern 205 compliance: errors logged, NOT silently swallowed.
// ════════════════════════════════════════════════════════════════

async function fetchCampaignMetadata(slug: string) {
  try {
    // Lightweight endpoint untuk SEO — getCampaign returns full campaign row,
    // we only need title/description/cover_image_url here.
    const res = await fetch(`${API_URL}/funding/campaigns/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status !== 404) {
        console.error('[generateMetadata] fetch failed', res.status, slug);
      }
      return null;
    }
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[generateMetadata] error', err);
    return null;
  }
}

async function fetchCampaignFullDetail(slug: string) {
  try {
    const res = await fetch(`${API_URL}/funding/campaigns/${encodeURIComponent(slug)}/detail`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status !== 404) {
        console.error('[fetchCampaignFullDetail] fetch failed', res.status, slug);
      }
      return null;
    }
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[fetchCampaignFullDetail] error', err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCampaignMetadata(slug);
  if (!data) return { title: 'Campaign tidak ditemukan' };
  return {
    title: `${data.title} | BADONASI`,
    description: data.description?.slice(0, 160),
    openGraph: {
      title: data.title,
      description: data.description?.slice(0, 160),
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function CampaignPage({ params }: Props) {
  const { slug } = await params;

  // ⭐ Phase B Bug #3 fix: SINGLE fetch ke backend.
  // Backend aggregates campaign + creator + donors + reports + updates
  //                   + disbursements + donor_messages + computed totals.
  // Was: 8 direct Supabase queries (silent catch hid RLS issues → CAIR Rp 0).
  // Now: 1 fetch, backend service_role bypass RLS, errors visible in logs.
  const detail = await fetchCampaignFullDetail(slug);

  if (!detail) notFound();

  const {
    campaign,
    creator,
    donors,
    reports,
    updates,
    disbursements,
    donorMessages,
    totalDisbursed,
    totalUsed,
  } = detail;

  const progress = campaign.target_amount > 0
    ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100)
    : 0;
  const daysLeft = daysRemaining(campaign.deadline);
  const category = CATEGORY_META[campaign.category] || CATEGORY_META.kesehatan;
  const isActive = campaign.status === 'active';
  const isCompleted = campaign.status === 'completed';


  // ═══════════════════════════════════════════════════════════
  // ALIRAN DANA TIMELINE — Merge all events chronologically
  // ═══════════════════════════════════════════════════════════

  type TimelineEvent = {
    type: 'start' | 'milestone' | 'disbursement' | 'usage' | 'completed';
    date: string;
    amount: number;
    title: string;
    subtitle?: string;
    notes?: string;
    proof_url?: string;
    stage_number?: number;
    report_number?: number;
  };

  const timeline: TimelineEvent[] = [];

  // 1. Campaign start
  timeline.push({
    type: 'start',
    date: campaign.created_at,
    amount: 0,
    title: 'Campaign Dimulai',
    subtitle: `Target ${formatRupiah(campaign.target_amount)}`,
  });

  // 2. Milestones — synthetic based on collected_amount if reached
  //    We don't have timestamps for milestones, so only show CURRENT state
  //    as a "current milestone" at the top of timeline order
  const milestonePct = progress;
  const milestonesReached: { pct: number; label: string }[] = [];
  if (milestonePct >= 25) milestonesReached.push({ pct: 25, label: 'Donasi Capai 25%' });
  if (milestonePct >= 50) milestonesReached.push({ pct: 50, label: 'Donasi Capai 50%' });
  if (milestonePct >= 75) milestonesReached.push({ pct: 75, label: 'Donasi Capai 75%' });
  if (milestonePct >= 100) milestonesReached.push({ pct: 100, label: 'Donasi Tercapai Penuh' });

  // Show LATEST milestone only (avoid clutter), undated (logical position after start)
  if (milestonesReached.length > 0) {
    const latest = milestonesReached[milestonesReached.length - 1];
    timeline.push({
      type: 'milestone',
      date: campaign.created_at, // approximate — will be reordered if disbursements earlier
      amount: campaign.collected_amount,
      title: latest.label,
      subtitle: `Terkumpul ${formatRupiah(campaign.collected_amount)} dari ${campaign.donor_count ?? 0} donatur`,
    });
  }

  // 3. Disbursements
  disbursements.forEach((d: any) => {
    timeline.push({
      type: 'disbursement',
      date: d.disbursed_at,
      amount: Number(d.amount || 0),
      title: `Pencairan Tahap ${d.stage_number}`,
      subtitle: d.disbursed_to,
      notes: d.notes,
      proof_url: d.evidence_urls?.[0],
      stage_number: d.stage_number,
    });
  });

  // 4. Usage reports
  reports.forEach((r: any) => {
    timeline.push({
      type: 'usage',
      date: r.created_at,
      amount: Number(r.amount_used || 0),
      title: `${r.title}`,
      subtitle: r.description,
      report_number: r.report_number,
    });
  });

  // 5. Completion marker
  if (isCompleted) {
    timeline.push({
      type: 'completed',
      date: campaign.updated_at ?? campaign.created_at,
      amount: campaign.collected_amount,
      title: 'Campaign Selesai',
      subtitle: 'Dana sudah disalurkan sepenuhnya',
    });
  }

  // Sort by date ascending (oldest first)
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasTimeline = timeline.length > 1; // more than just "start"

  // Color tokens by type
  const TIMELINE_COLORS: Record<TimelineEvent['type'], {
    dot: string;
    dotRing: string;
    bg: string;
    border: string;
    text: string;
    icon: any;
    label: string;
  }> = {
    start:        { dot: 'bg-gray-400',    dotRing: 'ring-gray-100',    bg: 'bg-gray-50',       border: 'border-gray-200',    text: 'text-gray-600',   icon: PlayCircle,         label: 'MULAI' },
    milestone:    { dot: 'bg-emerald-500', dotRing: 'ring-emerald-100', bg: 'bg-emerald-50',    border: 'border-emerald-200', text: 'text-emerald-700', icon: TrendingUp,         label: 'DANA MASUK' },
    disbursement: { dot: 'bg-amber-500',   dotRing: 'ring-amber-100',   bg: 'bg-amber-50',      border: 'border-amber-200',   text: 'text-amber-700',   icon: Banknote,           label: 'PENCAIRAN' },
    usage:        { dot: 'bg-blue-500',    dotRing: 'ring-blue-100',    bg: 'bg-blue-50',       border: 'border-blue-200',    text: 'text-blue-700',    icon: ShoppingBag,        label: 'PENGGUNAAN' },
    completed:    { dot: 'bg-emerald-600', dotRing: 'ring-emerald-100', bg: 'bg-emerald-50',    border: 'border-emerald-200', text: 'text-emerald-800', icon: PartyPopper,        label: 'SELESAI' },
  };

  const shareUrl = `https://teraloka.vercel.app/fundraising/${campaign.slug}`;
  const reportUrl = `/balapor/new?type=campaign&campaign_id=${campaign.id}&campaign_title=${encodeURIComponent(campaign.title)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Back */}
      <div className="mx-auto max-w-lg px-4 pt-4 pb-2">
        <Link
          href="/fundraising"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003526] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={16} /> Semua Campaign
        </Link>
      </div>

      {/* OFFLINE BANNER — show kalau penggalang sedang offline (darurat) */}
      {creator?.is_offline_mode && (
        <div className="mx-auto max-w-lg px-4 mb-3">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0 mt-0.5">🌴</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-1">
                  Penggalang Sedang Tidak Tersedia
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Donasi kamu tetap aman.</strong> Verifikasi mungkin sedikit tertunda hingga penggalang kembali online. Tim TeraLoka memantau semua donasi.
                </p>
                {creator?.offline_mode_until && (
                  <p className="text-[10px] text-amber-700 mt-2 font-medium">
                    Diperkirakan online kembali: {new Date(creator.offline_mode_until).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CAMPAIGN CARD */}
      <div className="mx-auto max-w-lg px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="relative aspect-[4/3] bg-gray-100">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.beneficiary_name || campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ImageIcon size={48} className="text-gray-300" />
              </div>
            )}

            <div className="absolute top-3 right-3 flex gap-2">
              {campaign.is_urgent && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md">
                  <Siren size={10} /> URGENT
                </span>
              )}
              <span
                className="px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-md"
                style={{ backgroundColor: category.color }}
              >
                {category.label}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
              <HeartHandshake size={11} className="text-[#F472B6]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">BADONASI</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
              {campaign.title}
            </h1>

            {creator && (
              <div className="flex items-center gap-2.5 py-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1B6B4A] to-[#003526] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {creator.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">Diajukan oleh</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{creator.name}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
                  <ShieldCheck size={9} /> WA verified
                </span>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                Terkumpul
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-2xl font-extrabold text-[#003526]">
                  {formatRupiah(campaign.collected_amount)}
                </p>
                <p className="text-sm font-bold text-[#EC4899]">
                  {progress.toFixed(1)}%
                </p>
              </div>
              <p className="text-xs text-gray-500">
                dari target <span className="font-semibold">{formatRupiah(campaign.target_amount)}</span>
              </p>

              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-[#003526] to-[#1B6B4A] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2.5 rounded-xl bg-gray-50">
                <Users size={14} className="mx-auto text-[#003526] mb-1" />
                <p className="text-base font-extrabold text-gray-900">{campaign.donor_count}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Donatur</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-gray-50">
                <Clock size={14} className={`mx-auto mb-1 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-[#003526]'}`} />
                <p className={`text-base font-extrabold ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-gray-900'}`}>
                  {daysLeft !== null ? daysLeft : '∞'}
                </p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Hari lagi</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-gray-50">
                <Target size={14} className="mx-auto text-[#003526] mb-1" />
                <p className="text-xs font-extrabold text-gray-900 leading-tight break-words">
                  {formatRupiah(Math.max(0, Number(campaign.target_amount) - Number(campaign.collected_amount)))}
                </p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">Kurang</p>
              </div>
            </div>

            {isActive && (
              <Link
                href={`/fundraising/${campaign.slug}/donate`}
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] py-4 text-sm font-bold text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all"
              >
                <HeartHandshake size={18} />
                Donasi Sekarang
                <ArrowRight size={16} className="opacity-80" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* VERIFIED BADGE */}
      {campaign.is_verified && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-900">Campaign Terverifikasi</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Diverifikasi tim TeraLoka pada {formatVerifyDate(campaign.verified_at)}
              </p>
            </div>
            <Link
              href="/fundraising/standar-verifikasi"
              className="shrink-0 text-[10px] font-bold text-emerald-700 uppercase tracking-wider underline-offset-2 hover:underline"
            >
              Cara<br />kerja
            </Link>
          </div>
        </div>
      )}

      {/* BENEFICIARY */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Penerima Manfaat</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003526] to-[#1B6B4A] flex items-center justify-center text-white text-lg font-bold shrink-0">
              {campaign.beneficiary_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{campaign.beneficiary_name}</p>
              {campaign.beneficiary_relation && (
                <p className="text-xs text-gray-500">{campaign.beneficiary_relation}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STORY */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#EC4899]" />
            Cerita di Balik Campaign
          </h2>
          <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line font-[450]">
            {campaign.description}
          </p>
        </div>
      </div>

      {/* KABAR TERBARU */}
      {updates.length > 0 && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Megaphone size={16} className="text-[#EC4899]" />
              Kabar Terbaru
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Update langsung dari creator campaign — kondisi penerima & progress. Kasih <strong>Aamiin</strong> untuk ikut mendoakan.
            </p>

            <div className="space-y-1">
              {updates.map((u: any, i: number) => (
                <div key={u.id} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1.5 shrink-0">
                    <div className={`w-3.5 h-3.5 rounded-full ${i === 0 ? 'bg-[#EC4899] ring-4 ring-pink-100' : 'bg-gray-300'}`}></div>
                    {i < updates.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-100 mt-1"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                      {i === 0 && (
                        <span className="text-[9px] font-bold text-[#EC4899] bg-pink-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Terbaru
                        </span>
                      )}
                      <p className="text-[11px] text-gray-400">{relativeTime(u.created_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1.5">{u.title}</p>
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line font-[450]">
                      {u.body}
                    </p>
                    {u.photos && u.photos.length > 0 && (
                      <div className={`mt-3 grid gap-2 ${u.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {u.photos.map((p: string, pi: number) => (
                          <a key={pi} href={p} target="_blank" rel="noopener noreferrer"
                            className="block aspect-video rounded-lg overflow-hidden bg-gray-100">
                            <img src={p} alt={`Foto ${pi + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex justify-start">
                      <UpdateAamiinButton
                        updateId={u.id}
                        initialCount={u.aamiin_count ?? 0}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ALIRAN DANA — NEW FINANCIAL TRANSPARENCY TIMELINE
         ═══════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
            <CircleDollarSign size={16} className="text-[#003526]" />
            Aliran Dana
          </h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Transparansi perjalanan dana — dari donatur masuk, pencairan ke partner, sampai pengeluaran untuk penerima. Semua dalam angka.
          </p>

          {/* Summary strip: 3 metrics */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={11} className="text-emerald-600" />
                <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Terkumpul</p>
              </div>
              <p className="text-base font-extrabold text-emerald-800 leading-none">
                {formatRupiah(campaign.collected_amount)}
              </p>
              <p className="text-[10px] text-emerald-600 mt-1">dari {campaign.donor_count ?? 0} donatur</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Banknote size={11} className="text-amber-600" />
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Cair</p>
              </div>
              <p className="text-base font-extrabold text-amber-800 leading-none">
                {formatRupiah(totalDisbursed)}
              </p>
              <p className="text-[10px] text-amber-600 mt-1">{disbursements.length} tahap</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShoppingBag size={11} className="text-blue-600" />
                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Dipakai</p>
              </div>
              <p className="text-base font-extrabold text-blue-800 leading-none">
                {formatRupiah(totalUsed)}
              </p>
              <p className="text-[10px] text-blue-600 mt-1">{reports.length} laporan</p>
            </div>
          </div>

          {/* Timeline */}
          {!hasTimeline ? (
            <div className="py-8 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
              <Activity size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 mb-1">Aliran dana akan muncul di sini</p>
              <p className="text-xs text-gray-500 leading-relaxed px-4">
                Setiap pencairan dana & pengeluaran akan tercatat secara kronologis.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {timeline.map((evt, i) => {
                const colors = TIMELINE_COLORS[evt.type];
                const Icon = colors.icon;
                return (
                  <div key={`${evt.type}-${i}`} className="flex gap-3">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className={`w-4 h-4 rounded-full ${colors.dot} ring-4 ${colors.dotRing}`}></div>
                      {i < timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-100 mt-1"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      {/* Header: type pill + date */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[9px] font-extrabold uppercase tracking-wider border ${colors.border}`}>
                          <Icon size={9} strokeWidth={2.5} />
                          {colors.label}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {formatShortDate(evt.date)}
                        </span>
                      </div>

                      {/* Card */}
                      <div className={`rounded-xl ${colors.bg} border ${colors.border} p-3`}>
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{evt.title}</p>
                          {/* ⭐ Single Source of Truth: Hide amount for 'usage' type
                              Reason: Penggunaan dana detail (with amount) sudah ditampilkan
                              di section "Rincian Penggunaan Dana" dengan breakdown items.
                              Timeline focus pada NARRATIVE, bukan repetition of numbers.
                              Pencairan + Dana Masuk tetap show amount (real money flow). */}
                          {evt.amount > 0 && evt.type !== 'usage' && (
                            <span className={`shrink-0 text-sm font-extrabold ${colors.text}`}>
                              {formatRupiah(evt.amount)}
                            </span>
                          )}
                        </div>
                        {evt.subtitle && (
                          <p className="text-xs text-gray-600 leading-relaxed">{evt.subtitle}</p>
                        )}
                        {evt.notes && (
                          <p className="text-[11px] text-gray-500 mt-1.5 italic">{evt.notes}</p>
                        )}
                        {evt.proof_url && (
                          <a href={evt.proof_url} target="_blank" rel="noopener noreferrer"
                            className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${colors.text} hover:underline`}>
                            <ImageIcon size={11} /> Lihat bukti transfer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 border border-gray-100">
            <Lock size={11} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              <strong>Kenapa tidak ada foto penerima?</strong> TeraLoka menjaga privasi & martabat penerima. Transparansi dana cukup lewat angka & dokumen resmi — tanpa mengekspos pribadi yang sedang kesusahan.
            </p>
          </div>
        </div>
      </div>

      {/* BUKTI & DOKUMENTASI */}
      {campaign.proof_documents && campaign.proof_documents.length > 0 && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-600" />
              Bukti & Dokumentasi
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Dokumen yang diunggah creator + dicek tim TeraLoka.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {campaign.proof_documents.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-emerald-300 transition-colors"
                >
                  <img
                    src={url}
                    alt={`Dokumen bukti ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1">
                    <span className="block text-[10px] text-white font-semibold bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-center">
                      Dokumen {i + 1}
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5">
              <Lock size={12} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Dokumen identitas (KTP) & data medis detail disimpan terpisah dan hanya diakses tim verifikasi TeraLoka.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PENCAIRAN DANA section dihapus — duplikat dengan Aliran Dana timeline.
          Aliran Dana sudah show timeline kronologis lengkap dengan disbursement
          detail (stage, date, amount, partner, notes, proof). No additional value
          from a separate "Detail Pencairan Dana" section.
          
          Filosofi: Less duplicate = better UX. Single source of truth untuk
          financial transparency. */}

      {/* RINCIAN PENGGUNAAN DANA */}
      {reports.length > 0 && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Receipt size={16} className="text-blue-600" />
              Rincian Penggunaan Dana
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Breakdown detail per pos pengeluaran — apa, berapa, untuk siapa.
            </p>

            <div className="space-y-4">
              {reports.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Laporan #{r.report_number}
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{r.title}</p>
                    </div>
                    <span className="text-base font-extrabold text-blue-700 shrink-0">
                      {formatRupiah(r.amount_used)}
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">{r.description}</p>
                  )}

                  {r.items && Array.isArray(r.items) && r.items.length > 0 && (
                    <div className="mt-3 rounded-lg bg-white p-3 border border-blue-100">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Breakdown</p>
                      <div className="space-y-1.5">
                        {r.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">
                              {item.name}
                              {item.qty > 1 && <span className="text-gray-400"> ×{item.qty}</span>}
                            </span>
                            <span className="font-semibold text-gray-900 font-mono">
                              {formatRupiah(item.subtotal || item.price * (item.qty || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATOR INFO */}
      {creator && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck size={16} className="text-[#003526]" />
              Pengaju Campaign
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1B6B4A] to-[#003526] flex items-center justify-center text-white text-base font-bold shrink-0">
                {creator.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{creator.name}</p>
                <p className="text-xs text-gray-500 font-mono">{maskPhone(creator.phone)}</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
                <ShieldCheck size={10} /> WA Verified
              </span>
            </div>
            <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
              Creator adalah pengguna TeraLoka dengan nomor WhatsApp terverifikasi. Nomor lengkap hanya terlihat oleh tim verifikasi.
            </p>
          </div>
        </div>
      )}

      {/* DONATUR */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#003526]" />
              Donatur ({donors.length})
            </h2>
            {donors.length > 0 && (
              <span className="text-xs font-semibold text-[#EC4899] bg-pink-50 px-2 py-1 rounded-full">Recent</span>
            )}
          </div>

          {donors.length === 0 ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] flex items-center justify-center mb-3">
                <Flame size={24} className="text-[#EC4899]" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Jadi yang pertama!</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Belum ada donatur terverifikasi. Donasimu bakal muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {donors.slice(0, 8).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(d.is_anonymous ? 'A' : d.donor_name?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {d.is_anonymous ? 'Hamba Allah' : d.donor_name}
                    </p>
                    <p className="text-xs text-gray-400">{relativeTime(d.created_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-[#003526] shrink-0">{formatRupiah(d.amount)}</p>
                </div>
              ))}
              {donors.length > 8 && (
                <p className="pt-2 text-center text-xs text-gray-400">
                  + {donors.length - 8} donatur lainnya
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DOA & HARAPAN */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Heart size={16} className="text-[#EC4899]" />
            Doa & Harapan
          </h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Pesan penuh doa dari donatur untuk penerima. Kasih Aamiin untuk ikut mendoakan.
          </p>

          {donorMessages.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center mb-3">
                <span className="text-2xl">🤲</span>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Belum ada doa yang dikirim</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Kirim doamu bersama donasi. Doa & harapan kamu akan muncul di sini setelah donasi diverifikasi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {donorMessages.map((m: any) => (
                <div key={m.id} className="rounded-xl bg-gradient-to-br from-pink-50/30 to-white border border-pink-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {m.donor_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{m.donor_name}</p>
                        <p className="text-[11px] text-gray-400 shrink-0">{relativeTime(m.created_at)}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2">Donasi {formatRupiah(m.amount)}</p>
                      <p className="text-[14px] text-gray-700 italic leading-relaxed font-[450]">
                        &ldquo;{m.message}&rdquo;
                      </p>
                      <div className="mt-3">
                        <AamiinButton
                          donationId={m.id}
                          initialCount={m.aamiin_count || 0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TRUST */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={20} className="text-[#95d3ba]" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Komitmen BADONASI</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#95d3ba] shrink-0 mt-0.5" />
              <span>100% donasi sampai ke penerima — tidak ada potongan</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#95d3ba] shrink-0 mt-0.5" />
              <span>Dana masuk ke rekening <strong>{campaign.bank_name}</strong> partner komunitas</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#95d3ba] shrink-0 mt-0.5" />
              <span>Laporan penggunaan dipublikasikan terbuka</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-[#95d3ba] shrink-0 mt-0.5" />
              <span>Verifikasi manual oleh tim TeraLoka Maluku Utara</span>
            </li>
          </ul>
        </div>
      </div>

      {/* PARTNER */}
      {campaign.partner_name && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-[#BA7517]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Komunitas Partner</p>
                <p className="text-sm font-bold text-gray-900 truncate">{campaign.partner_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Share2 size={16} className="text-[#EC4899]" />
            Bagikan ke Teman
          </h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Tiap share bisa jadi jalan buat lebih banyak donatur. Bantu sebar!
          </p>
          <ShareBar url={shareUrl} title={campaign.title} />
        </div>
      </div>

      {/* REPORT */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <Link
          href={reportUrl}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-white border border-red-200 text-red-600 py-3 text-xs font-semibold hover:bg-red-50 transition-colors"
        >
          <Flag size={14} />
          Laporkan campaign ini
        </Link>
        <p className="text-center text-[10px] text-gray-400 mt-1.5 leading-relaxed">
          Lihat yang mencurigakan? Laporan kamu akan ditinjau tim verifikasi dalam 24 jam.
        </p>
      </div>

      {/* COMPLETED */}
      {isCompleted && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <p className="text-base font-bold text-emerald-900 mb-1">Campaign Selesai</p>
            <p className="text-xs text-emerald-700">
              Terima kasih kepada semua donatur. Dana sudah disalurkan ke penerima.
            </p>
          </div>
        </div>
      )}

      {/* STICKY CTA */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-30">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Link
              href={`/fundraising/${campaign.slug}/donate`}
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] py-4 text-sm font-bold text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all"
            >
              <HeartHandshake size={18} />
              Donasi Sekarang
              <ArrowRight size={16} className="opacity-80" />
            </Link>
            {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <p className="text-[11px] text-center text-red-500 font-semibold mt-1.5 flex items-center justify-center gap-1">
                <Flame size={11} /> Tersisa {daysLeft} hari lagi!
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
