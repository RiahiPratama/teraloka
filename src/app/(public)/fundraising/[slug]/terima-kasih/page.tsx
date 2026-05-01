'use client';

// ═══════════════════════════════════════════════════════════════
// /fundraising/[slug]/terima-kasih/page.tsx — v3 Full Timeline
//
// Improvements over v2:
// - Pakai endpoint /donations/:id/timeline (return donation + disbursement + report)
// - Timeline extended dengan step "Dana Disalurkan" (kalau ada disbursement)
// - Timeline extended dengan step "Laporan Penggunaan" (kalau ada usage report)
// - Financial summary card "Dana terkumpul vs disalurkan"
// - Top 3 latest disbursements expandable
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HeartHandshake, CheckCircle2, Clock, Share2, Home, MessageCircle,
  Copy, Check, Hash, Loader2, Sparkles, AlertTriangle, XCircle,
  RefreshCw, Upload, Phone, Wallet, FileText, Building2, ChevronDown,
  ChevronUp, TrendingUp,
} from 'lucide-react';
import { formatRupiah } from '@/utils/format';
import ShareBar from '../_components/ShareBar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const POLL_INTERVAL_MS = 30000;
const MAX_POLL_DURATION_MS = 600000;
const ADMIN_WA = '6281289539452';

interface Donation {
  id: string;
  campaign_id: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  penggalang_fee: number;
  total_transfer: number;
  donation_code: string;
  message?: string | null;
  transfer_proof_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  campaigns?: {
    title: string;
    slug: string;
    partner_name?: string;
    beneficiary_name?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    cover_image_url?: string;
  };
}

interface Disbursement {
  id: string;
  stage_number: number;
  amount: number;
  disbursed_to: string;
  disbursed_at: string;
  method: string;
  evidence_urls: string[];
  handover_photo_url: string | null;
  disbursement_notes: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
}

interface UsageReport {
  id: string;
  report_number: number;
  title: string;
  description: string | null;
  amount_used: number;
  items: any;
  proof_photos: string[];
  status: string;
  created_at: string;
}

interface TimelineData {
  donation: Donation;
  financial_summary: {
    total_collected: number;
    total_disbursed: number;
    disbursement_percentage: number;
    total_disbursements_count: number;
  };
  recent_disbursements: Disbursement[];
  has_usage_report: boolean;
  latest_usage_report: UsageReport | null;
}

export default function TerimaKasihPage({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const { slug } = use(params);
  const donationId = searchParams.get('id');

  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusJustChanged, setStatusJustChanged] = useState<string | null>(null);
  const pollStartRef = useRef<number>(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchTimeline(silent = false) {
    if (!donationId) {
      setLoading(false);
      return null;
    }
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`${API}/funding/donations/${donationId}/timeline`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Detect status change
        if (data && data.donation.verification_status !== json.data.donation.verification_status) {
          setStatusJustChanged(json.data.donation.verification_status);
          setTimeout(() => setStatusJustChanged(null), 5000);
        }
        // Detect new disbursement
        if (data && (data.recent_disbursements?.length ?? 0) < (json.data.recent_disbursements?.length ?? 0)) {
          setStatusJustChanged('disbursement');
          setTimeout(() => setStatusJustChanged(null), 5000);
        }
        setData(json.data);
        return json.data;
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      if (!silent) setTimeout(() => setRefreshing(false), 400);
    }
    return null;
  }

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donationId]);

  // Auto-poll: lebih agresif kalau pending, tetap polling kalau verified untuk catch disbursement
  useEffect(() => {
    if (!data) return;
    const status = data.donation.verification_status;

    // Stop polling kalau rejected (terminal state)
    if (status === 'rejected') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (pollTimerRef.current) return;

    pollStartRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
      const elapsed = Date.now() - pollStartRef.current;
      if (elapsed > MAX_POLL_DURATION_MS) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }
      await fetchTimeline(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.donation.verification_status]);

  function copyDonationCode() {
    if (!data?.donation.donation_code) return;
    navigator.clipboard.writeText(data.donation.donation_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDF2F8] via-white to-[#003526]/5">
        <Loader2 size={32} className="animate-spin text-[#EC4899]" />
      </div>
    );
  }

  const donation = data?.donation;
  const status = donation?.verification_status ?? 'pending';
  const hasProof = !!donation?.transfer_proof_url;
  const userMessage = donation?.message?.trim() || '';
  const hasDisbursements = (data?.recent_disbursements?.length ?? 0) > 0;
  const hasReport = data?.has_usage_report ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF2F8] via-white to-[#003526]/5 pb-8">

      {/* Status change banners */}
      {statusJustChanged === 'verified' && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-top">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">Donasi kamu baru saja diverifikasi! 🎉</p>
          </div>
        </div>
      )}
      {statusJustChanged === 'rejected' && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div className="bg-red-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-top">
            <XCircle size={20} />
            <p className="text-sm font-bold">Status donasi kamu diperbarui</p>
          </div>
        </div>
      )}
      {statusJustChanged === 'disbursement' && (
        <div className="mx-auto max-w-md px-4 pt-4">
          <div className="bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-top">
            <Wallet size={20} />
            <p className="text-sm font-bold">Dana kampanye baru saja disalurkan! 💸</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <HeroSection donation={donation} status={status} />

      {/* Main Timeline Card */}
      {data && donation && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <FullTimelineCard
            data={data}
            refreshing={refreshing}
            onRefresh={() => fetchTimeline(false)}
          />
        </div>
      )}

      {/* Financial Summary Card — show if verified + has disbursements */}
      {status === 'verified' && hasDisbursements && data && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <FinancialSummaryCard summary={data.financial_summary} />
        </div>
      )}

      {/* Recent Disbursements — show if verified + has disbursements */}
      {status === 'verified' && hasDisbursements && data && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <DisbursementsList disbursements={data.recent_disbursements} totalCount={data.financial_summary.total_disbursements_count} />
        </div>
      )}

      {/* Usage Report Card — kalau ada */}
      {status === 'verified' && hasReport && data?.latest_usage_report && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <UsageReportCard report={data.latest_usage_report} />
        </div>
      )}

      {/* Donation Details */}
      {donation && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Detail Donasi</p>
            <div className="space-y-2.5">
              <DetailRow label="Nominal donasi" value={formatRupiah(donation.amount)} bold />
              {donation.operational_fee > 0 && (
                <DetailRow
                  label="+ Dukungan operasional"
                  value={formatRupiah(donation.operational_fee)}
                  valueColor="text-[#BA7517]"
                  small
                />
              )}
              {donation.penggalang_fee > 0 && (
                <DetailRow
                  label="+ Fee penggalang"
                  value={formatRupiah(donation.penggalang_fee)}
                  valueColor="text-[#BA7517]"
                  small
                />
              )}
              <div className="border-t border-dashed border-gray-200 my-2" />
              <DetailRow label="Total transfer" value={formatRupiah(donation.total_transfer)} bold />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Hash size={12} /> Kode transaksi
                </span>
                <button
                  onClick={copyDonationCode}
                  className="flex items-center gap-1 text-sm font-bold text-[#EC4899] font-mono tracking-wider hover:opacity-80 active:scale-95 transition-all"
                >
                  {donation.donation_code}
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donor's message */}
      {userMessage && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <div className="bg-[#003526]/5 border border-[#003526]/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-[#003526] uppercase tracking-widest mb-2">Pesan & Doa dari Kamu</p>
            <p className="text-sm text-gray-700 italic leading-relaxed">&quot;{userMessage}&quot;</p>
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              {status === 'verified'
                ? <>Doa kamu sudah masuk ke <strong>wall Doa & Harapan</strong> — jadi bagian dari dukungan untuk penerima.</>
                : <>Doa kamu akan muncul di <strong>wall Doa & Harapan</strong> setelah donasi diverifikasi.</>
              }
            </p>
          </div>
        </div>
      )}

      {/* Inspirational message — verified only */}
      {status === 'verified' && (
        <div className="mx-auto max-w-md px-4 mb-6">
          <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} className="text-[#95d3ba] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold mb-1">Setiap Kebaikan Akan Kembali</p>
                <p className="text-xs text-white/85 leading-relaxed">
                  Donasimu jadi bagian dari perubahan kecil yang berdampak besar bagi warga Maluku Utara. Jazakumullahu khairan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection CTA */}
      {status === 'rejected' && donation?.rejection_reason && (
        <div className="mx-auto max-w-md px-4 mb-6">
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Halo tim TeraLoka, saya mau klarifikasi tentang donasi saya dengan kode ${donation.donation_code}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] hover:bg-[#1FAE52] text-white text-sm font-bold py-3.5 rounded-2xl text-center active:scale-95 transition-all"
          >
            <span className="inline-flex items-center gap-2">
              <Phone size={16} />
              Hubungi Tim via WhatsApp
            </span>
          </a>
        </div>
      )}

      {/* CTAs */}
      <div className="mx-auto max-w-md px-4 space-y-2.5">
        {donation?.campaigns && status !== 'rejected' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Share2 size={12} /> Ajak Teman Donasi
            </p>
            <ShareBar
              url={`https://teraloka.vercel.app/fundraising/${slug}`}
              title={donation.campaigns?.title ?? 'Bantu campaign ini di BADONASI!'}
            />
          </div>
        )}

        <Link
          href={`/fundraising/${slug}`}
          className="flex items-center justify-center gap-2 w-full bg-white border border-[#003526]/10 text-[#003526] text-sm font-bold py-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all"
        >
          <MessageCircle size={16} />
          Lihat Update Campaign
        </Link>

        <Link
          href="/fundraising"
          className="flex items-center justify-center gap-2 w-full text-gray-500 text-sm font-semibold py-3 hover:text-gray-700 transition-colors"
        >
          <Home size={14} />
          Jelajahi Campaign Lain
        </Link>
      </div>

    </div>
  );
}

// ─── Hero (status-aware) ─────────────────────────────────────────
function HeroSection({ donation, status }: { donation: Donation | undefined; status: string }) {
  const config = getHeroConfig(status, donation);

  return (
    <div className="px-4 pt-12 pb-8">
      <div className="mx-auto max-w-md text-center">
        <div className="relative inline-block mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: config.iconBg, boxShadow: config.iconShadow }}
          >
            <config.icon size={48} className="text-white" />
          </div>
          {(status === 'verified' || status === 'pending') && donation && (
            <>
              <Sparkles size={16} className="absolute -top-1 -right-2 text-yellow-400 animate-pulse" />
              <Sparkles size={14} className="absolute top-4 -left-3 text-pink-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <Sparkles size={12} className="absolute -bottom-1 right-2 text-[#003526] animate-pulse" style={{ animationDelay: '0.6s' }} />
            </>
          )}
        </div>

        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${config.eyebrowCls}`}>
          {config.eyebrow}
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          {config.title(donation)}
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          {config.subtitle(donation)}
        </p>
      </div>
    </div>
  );
}

function getHeroConfig(status: string, donation: Donation | undefined) {
  if (status === 'verified') {
    return {
      icon: CheckCircle2,
      iconBg: 'linear-gradient(135deg, #10B981, #047857)',
      iconShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.25)',
      eyebrow: 'Donasi Diterima ✓',
      eyebrowCls: 'text-emerald-600',
      title: (d: Donation | undefined) =>
        d && !d.is_anonymous ? `Donasimu Sudah Tersalurkan, ${d.donor_name}!` : 'Donasimu Sudah Tersalurkan!',
      subtitle: (d: Donation | undefined) => d ? (
        <>
          <span className="font-bold text-emerald-700">{formatRupiah(d.amount)}</span>
          {d.campaigns && <> untuk <span className="font-bold">{d.campaigns.title}</span></>}
          {' '}sudah masuk ke kas penggalang.
        </>
      ) : 'Donasimu sudah diverifikasi.',
    };
  }

  if (status === 'rejected') {
    return {
      icon: XCircle,
      iconBg: 'linear-gradient(135deg, #EF4444, #B91C1C)',
      iconShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.25)',
      eyebrow: 'Mohon Maaf',
      eyebrowCls: 'text-red-600',
      title: () => 'Donasi Tidak Dapat Diverifikasi',
      subtitle: (d: Donation | undefined) => d?.rejection_reason
        ? <>Tim kami tidak dapat memproses donasi ini. Lihat detail di bawah untuk klarifikasi.</>
        : <>Mohon hubungi tim untuk informasi lebih lanjut.</>,
    };
  }

  return {
    icon: HeartHandshake,
    iconBg: 'linear-gradient(135deg, #EC4899, #BE185D)',
    iconShadow: '0 20px 25px -5px rgba(236, 72, 153, 0.25)',
    eyebrow: 'Alhamdulillah',
    eyebrowCls: 'text-[#EC4899]',
    title: (d: Donation | undefined) =>
      d && !d.is_anonymous ? `Terima Kasih, ${d.donor_name}!` : 'Terima Kasih!',
    subtitle: (d: Donation | undefined) => d ? (
      <>
        Donasimu <span className="font-bold text-[#003526]">{formatRupiah(d.amount)}</span>
        {d.campaigns && <> untuk <span className="font-bold">{d.campaigns.title}</span></>}
        {' '}telah kami catat.
      </>
    ) : 'Donasimu telah kami terima.',
  };
}

// ─── Full Timeline Card (5-step) ─────────────────────────────────
function FullTimelineCard({
  data, refreshing, onRefresh,
}: {
  data: TimelineData;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { donation, recent_disbursements, has_usage_report } = data;
  const status = donation.verification_status;
  const hasProof = !!donation.transfer_proof_url;
  const isPending = status === 'pending';
  const hasDisbursements = recent_disbursements.length > 0;

  const headerConfig = (() => {
    if (status === 'verified') {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        textTitle: 'text-emerald-800',
        textSub: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        icon: CheckCircle2,
        title: 'Donasi Diterima',
        sub: donation.verified_at
          ? `Diverifikasi ${new Date(donation.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : 'Sudah diverifikasi tim',
      };
    }
    if (status === 'rejected') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        textTitle: 'text-red-800',
        textSub: 'text-red-700',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-700',
        icon: XCircle,
        title: 'Donasi Ditolak',
        sub: 'Lihat alasan di bawah',
      };
    }
    if (isPending && !hasProof) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        textTitle: 'text-amber-800',
        textSub: 'text-amber-700',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        icon: AlertTriangle,
        title: 'Bukti Belum Diupload',
        sub: 'Upload bukti agar bisa diverifikasi',
      };
    }
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      textTitle: 'text-amber-800',
      textSub: 'text-amber-700',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-700',
      icon: Clock,
      title: 'Sedang Diverifikasi',
      sub: 'Tim cek 1-2 hari kerja',
    };
  })();

  const HeaderIcon = headerConfig.icon;
  const showRefreshButton = status !== 'rejected';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`${headerConfig.bg} ${headerConfig.border} border-b p-4`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${headerConfig.iconBg} flex items-center justify-center shrink-0`}>
            <HeaderIcon size={18} className={headerConfig.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-bold ${headerConfig.textTitle}`}>{headerConfig.title}</p>
              {showRefreshButton && (
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className={`p-1.5 rounded-lg ${headerConfig.iconBg} hover:opacity-80 active:scale-95 transition-all disabled:opacity-50`}
                  aria-label="Refresh status"
                >
                  <RefreshCw size={12} className={`${headerConfig.iconColor} ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className={`text-xs ${headerConfig.textSub} mt-0.5`}>{headerConfig.sub}</p>
          </div>
        </div>

        {isPending && !hasProof && donation.campaigns && (
          <Link
            href={`/fundraising/${donation.campaigns.slug}/konfirmasi?id=${donation.id}`}
            className="mt-3 flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-lg active:scale-95 transition-all"
          >
            <Upload size={14} />
            Upload Bukti Sekarang
          </Link>
        )}

        {status === 'rejected' && donation.rejection_reason && (
          <div className="mt-3 bg-white rounded-lg p-3 border border-red-100">
            <p className="text-[10px] font-bold text-red-700 uppercase mb-1 tracking-wider">Alasan Ditolak</p>
            <p className="text-xs text-red-900 leading-relaxed">{donation.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Timeline 5 steps */}
      <div className="p-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Perjalanan Donasi</p>
        <div className="space-y-1">
          <TimelineStep
            done
            label="Donasi disubmit"
            time={new Date(donation.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          />
          <TimelineStep
            done={hasProof}
            label="Bukti transfer diupload"
            time={hasProof ? 'Selesai' : 'Belum upload'}
            warning={!hasProof && isPending}
          />
          <TimelineStep
            done={status === 'verified'}
            current={status === 'pending' && hasProof}
            warning={status === 'rejected'}
            label={status === 'rejected' ? 'Donasi ditolak' : 'Donasi diverifikasi'}
            time={
              status === 'verified' && donation.verified_at
                ? new Date(donation.verified_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : status === 'pending'
                ? 'Estimasi 1-2 hari kerja'
                : 'Tidak dapat diverifikasi'
            }
          />
          {status !== 'rejected' && (
            <>
              <TimelineStep
                done={hasDisbursements}
                future={!hasDisbursements && status !== 'verified'}
                label="Dana disalurkan ke penerima"
                time={
                  hasDisbursements
                    ? `${data.financial_summary.total_disbursements_count}× pencairan terverifikasi`
                    : status === 'verified'
                    ? 'Akan diproses penggalang'
                    : 'Setelah donasi diverifikasi'
                }
              />
              <TimelineStep
                done={has_usage_report}
                future={!has_usage_report}
                label="Laporan penggunaan"
                time={
                  has_usage_report
                    ? 'Penggalang sudah laporkan'
                    : 'Setelah dana digunakan'
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  done, current, future, warning, label, time,
}: {
  done?: boolean; current?: boolean; future?: boolean; warning?: boolean;
  label: string; time?: string;
}) {
  let dotCls = 'border-2 border-gray-300';
  let labelCls = 'text-gray-700';
  let timeCls = 'text-gray-400';
  let iconContent: React.ReactNode = null;

  if (done) {
    dotCls = 'bg-emerald-500';
    iconContent = <Check size={9} className="text-white" strokeWidth={3.5} />;
  } else if (current) {
    dotCls = 'border-2 border-amber-500 bg-amber-50';
    labelCls = 'text-amber-800 font-bold';
    iconContent = <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />;
  } else if (warning) {
    dotCls = 'bg-red-500';
    labelCls = 'text-red-800 font-bold';
    iconContent = <XCircle size={11} className="text-white" />;
  } else if (future) {
    dotCls = 'border-2 border-gray-300';
    labelCls = 'text-gray-400';
    timeCls = 'text-gray-400';
  }

  return (
    <div className={`flex items-start gap-3 py-1.5 ${future ? 'opacity-60' : ''}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${dotCls}`}>
        {iconContent}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${labelCls}`}>{label}</p>
        {time && <p className={`text-[10px] ${timeCls} mt-0.5`}>{time}</p>}
      </div>
    </div>
  );
}

// ─── Financial Summary Card ──────────────────────────────────────
function FinancialSummaryCard({ summary }: { summary: TimelineData['financial_summary'] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-[#003526]" />
        <p className="text-xs font-bold text-[#003526] uppercase tracking-widest">Status Dana Kampanye</p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Total terkumpul</span>
          <span className="text-sm font-bold text-gray-900">{formatRupiah(summary.total_collected)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Sudah disalurkan</span>
          <span className="text-sm font-bold text-emerald-700">{formatRupiah(summary.total_disbursed)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
          style={{ width: `${summary.disbursement_percentage}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-500 text-center">
        <span className="font-bold text-emerald-700">{summary.disbursement_percentage}%</span> dana tersalurkan
        {' · '}
        <span className="font-medium">{summary.total_disbursements_count} kali pencairan</span>
      </p>
    </div>
  );
}

// ─── Disbursements List ──────────────────────────────────────────
function DisbursementsList({
  disbursements, totalCount,
}: {
  disbursements: Disbursement[]; totalCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? disbursements : disbursements.slice(0, 1);
  const hasMore = disbursements.length > 1 || totalCount > disbursements.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={14} className="text-blue-600" />
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Pencairan Dana</p>
        </div>
        <p className="text-xs text-gray-500">{totalCount} pencairan terverifikasi</p>
      </div>

      <div className="px-5 pb-5 space-y-2.5">
        {displayed.map((d, i) => (
          <DisbursementItem key={d.id} d={d} stage={d.stage_number || (i + 1)} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 border-t border-gray-100 text-xs font-bold text-blue-600 hover:bg-blue-50 active:scale-[0.99] transition-all flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>Tutup <ChevronUp size={12} /></>
          ) : (
            <>
              {disbursements.length > 1 ? `Lihat ${disbursements.length - 1} pencairan lainnya` : 'Lihat detail'}
              <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function DisbursementItem({ d, stage }: { d: Disbursement; stage: number }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/50">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
            {stage}
          </span>
          <span className="text-xs font-bold text-gray-900">{d.disbursed_to}</span>
        </div>
        <span className="text-sm font-black text-blue-700">{formatRupiah(d.amount)}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500 ml-7 mb-1">
        <span className="flex items-center gap-1">
          <Building2 size={10} />
          {d.method}
        </span>
        <span>·</span>
        <span>
          {new Date(d.disbursed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      {d.disbursement_notes && (
        <p className="text-[11px] text-gray-600 ml-7 mt-1.5 italic leading-relaxed">
          &quot;{d.disbursement_notes}&quot;
        </p>
      )}
      {d.evidence_urls && d.evidence_urls.length > 0 && (
        <div className="ml-7 mt-2 flex gap-1.5 flex-wrap">
          {d.evidence_urls.slice(0, 3).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 active:scale-95 transition-all"
            >
              <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
          {d.evidence_urls.length > 3 && (
            <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-500">
              +{d.evidence_urls.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Usage Report Card ───────────────────────────────────────────
function UsageReportCard({ report }: { report: UsageReport }) {
  const itemCount = Array.isArray(report.items) ? report.items.length : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-purple-600" />
        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Laporan Penggunaan</p>
      </div>

      <p className="text-sm font-bold text-gray-900 mb-1">
        Laporan #{report.report_number} · {report.title}
      </p>
      {report.description && (
        <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{report.description}</p>
      )}

      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-gray-500">Total dilaporkan</span>
        <span className="font-bold text-purple-700">{formatRupiah(report.amount_used)}</span>
      </div>

      {itemCount > 0 && (
        <div className="bg-purple-50 rounded-lg px-3 py-2 mb-3">
          <p className="text-[11px] text-purple-800 font-medium">
            Berisi <span className="font-bold">{itemCount} rincian penggunaan</span> untuk transparansi penuh
          </p>
        </div>
      )}

      {report.proof_photos && report.proof_photos.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {report.proof_photos.slice(0, 4).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 active:scale-95 transition-all"
            >
              <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
          {report.proof_photos.length > 4 && (
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-500">
              +{report.proof_photos.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────
function DetailRow({
  label, value, bold, small, valueColor,
}: {
  label: string; value: string; bold?: boolean; small?: boolean; valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`${small ? 'text-[11px]' : 'text-xs'} text-gray-500`}>{label}</span>
      <span className={`${small ? 'text-xs' : 'text-sm'} ${bold ? 'font-bold' : 'font-semibold'} ${valueColor ?? 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
