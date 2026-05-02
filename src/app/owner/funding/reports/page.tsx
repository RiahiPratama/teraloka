'use client';

// ═══════════════════════════════════════════════════════════════════
// /owner/funding/reports — Global Laporan Inbox
// ═══════════════════════════════════════════════════════════════════
//
// Penggalang umbrella view untuk SEMUA laporan penggunaan dana dari
// SEMUA kampanye. Akses dari bottom nav tab "Laporan" saat di /owner.
//
// 3 Smart Views:
//   • Perlu Aksi (default)    — Pending review + Revision needed (yang harus action)
//   • Disetujui               — Approved, masuk timeline transparency
//   • Semua                   — All status
//
// Filosofi 4 Pilar:
//   - Credibility   : default ke "Perlu Aksi" (tracking obligation)
//   - Transparency  : stats summary total dilaporkan visible
//   - Accountability: revision_needed prominently warned, deadline-aware
//   - Comfort       : mobile-first card stack, friendly empty states
//
// Architecture: Backend (Otak) compute aggregate, frontend (Wajah) display only.
//
// Backend: GET /funding/my/usage-reports
// Returns: { data: enriched[], meta: { page, limit, total }, stats }
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Hourglass,
  RefreshCw, FileText, ChevronRight, ClipboardList, Inbox, TrendingUp,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────────
type ReportStatus = 'pending' | 'approved' | 'revision_needed';
type SmartView = 'perlu_aksi' | 'disetujui' | 'all';

interface CampaignSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface ReportListItem {
  id: string;
  campaign_id: string;
  report_number: number;
  title: string;
  description: string;
  amount_used: number;
  proof_photos: string[];
  items: any[] | null;
  status: ReportStatus;
  admin_review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  campaign: CampaignSummary | null;
}

interface ReportStats {
  total_count: number;
  total_amount_reported: number;
  pending_count: number;
  approved_count: number;
  revision_count: number;
}

// ─── Status config ───────────────────────────────────────────────
const STATUS_CONFIG: Record<ReportStatus, {
  label: string;
  color: string;
  bg: string;
  icon: any;
}> = {
  pending:          { label: 'Menunggu Review', color: '#B45309', bg: '#FEF3C7', icon: Hourglass    },
  approved:         { label: 'Disetujui',       color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  revision_needed:  { label: 'Perlu Revisi',    color: '#B91C1C', bg: '#FEE2E2', icon: RefreshCw    },
};

// ─── Smart View config ───────────────────────────────────────────
const SMART_VIEWS: Array<{ key: SmartView; label: string; emoji: string }> = [
  { key: 'perlu_aksi', label: 'Perlu Aksi',  emoji: '⏳' },
  { key: 'disetujui',  label: 'Disetujui',   emoji: '✅' },
  { key: 'all',        label: 'Semua',       emoji: '📋' },
];

// ─── Inner component (Suspense-wrapped) ──────────────────────────
function OwnerReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  // Filter state — URL-synced
  const [smartView, setSmartView] = useState<SmartView>(
    (searchParams.get('view') as SmartView) || 'perlu_aksi'
  );
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);

  // Data state
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  // ─── Auth gate ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // ─── URL sync ──────────────────────────────────────────────────
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (smartView !== 'perlu_aksi') params.set('view', smartView);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/owner/funding/reports?${qs}` : '/owner/funding/reports', { scroll: false });
  }, [smartView, page, router]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  // ─── Fetch data ────────────────────────────────────────────────
  // Note: smart view "perlu_aksi" combines pending + revision_needed,
  // jadi kita fetch all dan filter client-side untuk view ini.
  // Untuk view lain, langsung filter at backend.
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // "perlu_aksi" = pending + revision_needed (need 2 fetch atau fetch all + filter)
      // Pakai approach simpler: fetch all, terus filter client-side untuk "perlu_aksi"
      let statusParam = 'all';
      if (smartView === 'disetujui') statusParam = 'approved';
      // "perlu_aksi" + "all" → fetch all

      const url = `${API_URL}/funding/my/usage-reports?status=${statusParam}&page=${page}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Gagal load data');
        setReports([]);
        return;
      }

      let data = json.data ?? [];

      // Client-side filter untuk smart view "perlu_aksi"
      if (smartView === 'perlu_aksi') {
        data = data.filter(
          (r: ReportListItem) => r.status === 'pending' || r.status === 'revision_needed'
        );
      }

      setReports(data);
      setStats(json.stats ?? null);
      setTotal(
        smartView === 'perlu_aksi'
          ? data.length
          : (json.meta?.total ?? 0)
      );
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, [token, smartView, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Refresh on tab focus ──────────────────────────────────────
  useEffect(() => {
    function onFocus() {
      fetchData();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  // ─── Computed ──────────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);
  const isEmpty = !loading && reports.length === 0;

  // Combined "perlu_aksi" count for stats display
  const perluAksiCount = (stats?.pending_count ?? 0) + (stats?.revision_count ?? 0);

  // ─── Render ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link
            href="/owner"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-800">Laporan Saya</h1>
        </div>
      </header>

      {/* ═══ Stats Summary ═══ */}
      <section className="px-4 pt-4">
        <div
          className="rounded-2xl p-4 text-white"
          style={{
            background: 'linear-gradient(135deg, #003526 0%, #0891B2 100%)',
            boxShadow: '0 4px 16px rgba(0,53,38,0.2)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5 opacity-90">
            <ClipboardList size={14} />
            <span className="text-xs font-medium tracking-wide">TOTAL DILAPORKAN</span>
          </div>
          <div className="text-2xl font-bold mb-3">
            {stats ? formatRupiah(stats.total_amount_reported) : '—'}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
            <StatItem label="Total" value={stats?.total_count ?? 0} icon={<FileText size={12} />} />
            <StatItem label="Perlu Aksi" value={perluAksiCount} icon={<Hourglass size={12} />} />
            <StatItem label="Disetujui" value={stats?.approved_count ?? 0} icon={<CheckCircle2 size={12} />} />
          </div>
        </div>
      </section>

      {/* ═══ Smart View Tabs ═══ */}
      <section className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SMART_VIEWS.map((sv) => {
            const active = smartView === sv.key;
            return (
              <button
                key={sv.key}
                onClick={() => {
                  setSmartView(sv.key);
                  setPage(1);
                }}
                className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
                style={{
                  background: active ? '#003526' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  border: active ? 'none' : '1px solid #E5E7EB',
                  boxShadow: active ? '0 2px 8px rgba(0,53,38,0.25)' : 'none',
                }}
              >
                <span className="mr-1">{sv.emoji}</span>
                {sv.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ List ═══ */}
      <section className="px-4 pt-4">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isEmpty ? (
          <EmptyState smartView={smartView} />
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}

            {/* Pagination — hanya show kalau bukan smart view "perlu_aksi" (karena filtered client-side) */}
            {smartView !== 'perlu_aksi' && totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 active:scale-95"
                >
                  ← Sebelumnya
                </button>
                <span className="text-xs text-gray-500">
                  Hal {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 active:scale-95"
                >
                  Berikutnya →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function StatItem({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1 text-[10px] font-medium opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
  );
}

function ReportCard({ report: r }: { report: ReportListItem }) {
  const config = STATUS_CONFIG[r.status];
  const StatusIcon = config.icon;
  const detailHref = r.campaign
    ? `/owner/funding/campaigns/${r.campaign_id}/reports`  // No detail page yet — link to per-campaign list
    : '#';

  return (
    <Link
      href={detailHref}
      className="block bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-[0.99] transition-all"
    >
      {/* Top row: campaign + status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">
            Laporan #{r.report_number} · {r.campaign?.title ?? '—'}
          </div>
          <div className="text-sm font-bold text-gray-800 line-clamp-1">
            {r.title}
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: config.bg }}
        >
          <StatusIcon size={11} style={{ color: config.color }} />
          <span className="text-[10px] font-bold" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Description preview */}
      {r.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
          {r.description}
        </p>
      )}

      {/* Amount + meta */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <div className="text-lg font-bold text-[#003526]">
            {formatRupiah(r.amount_used)}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {new Date(r.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {r.proof_photos && r.proof_photos.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                · 📎 {r.proof_photos.length} foto
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
      </div>

      {/* Revision needed warning */}
      {r.status === 'revision_needed' && r.admin_review_notes && (
        <div
          className="mt-3 p-2 rounded-lg text-[11px] flex items-start gap-1.5"
          style={{ background: '#FEE2E2', color: '#B91C1C' }}
        >
          <RefreshCw size={12} className="flex-shrink-0 mt-0.5" />
          <span><strong>Perlu Revisi:</strong> {r.admin_review_notes}</span>
        </div>
      )}
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
          <div className="h-3 w-1/3 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
          <div className="h-3 w-full bg-gray-200 rounded mb-1" />
          <div className="h-3 w-3/4 bg-gray-200 rounded mb-3" />
          <div className="h-5 w-1/3 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-500" />
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">Gagal Load Data</h3>
      <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-[#003526] text-white text-xs font-bold active:scale-95"
      >
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState({ smartView }: { smartView: SmartView }) {
  const meta = (() => {
    switch (smartView) {
      case 'perlu_aksi':
        return {
          icon: <Hourglass size={24} className="text-amber-500" />,
          bg: 'bg-amber-50',
          title: 'Tidak ada laporan menunggu',
          desc: 'Semua laporan sudah direview admin atau sudah revisi. Mantap!',
        };
      case 'disetujui':
        return {
          icon: <CheckCircle2 size={24} className="text-emerald-500" />,
          bg: 'bg-emerald-50',
          title: 'Belum ada laporan disetujui',
          desc: 'Laporan penggunaan dana yang disetujui admin akan masuk timeline transparency.',
        };
      default:
        return {
          icon: <Inbox size={24} className="text-gray-400" />,
          bg: 'bg-gray-100',
          title: 'Belum ada laporan',
          desc: 'Laporan penggunaan dana dari semua kampanye yang kamu kelola akan muncul di sini.',
        };
    }
  })();

  return (
    <div className="text-center py-12 px-4">
      <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${meta.bg}`}>
        {meta.icon}
      </div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">{meta.title}</h3>
      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">{meta.desc}</p>

      {smartView === 'all' && (
        <Link
          href="/owner/funding/campaigns"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-[#003526] text-white text-xs font-bold active:scale-95"
        >
          <TrendingUp size={12} />
          Buka Kampanye Saya
        </Link>
      )}
    </div>
  );
}

// ─── Default export with Suspense ────────────────────────────────
export default function OwnerReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <OwnerReportsContent />
    </Suspense>
  );
}
