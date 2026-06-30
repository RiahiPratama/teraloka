'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Dashboard (Tahap A)
// PATH: src/app/owner/balaundry/page.tsx
// ────────────────────────────────────────────────────────────────
// GET /balaundry/owner/overview → subscription + summary + businesses[].
// 🛡️ WAJAH only: render angka apa adanya dari BE. NOL hitung ulang.
// Auth gate INLINE (mirror owner/bakos, BUKAN auto-redirect).
// useApi() (Bearer auto) — BUKAN raw fetch. Royal blue var(--color-balaundry).
// Material Symbols (no emoji/lucide). Navbar global dari layout.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { formatRupiah } from '@/lib/balaundry-links';
import type { OwnerOverview, OwnerBusinessCard } from '@/components/balaundry/owner/types';

export default function OwnerBalaundryDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [data, setData] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      // client.ts:185 `return parsed.data` → api.get balikin data SUDAH ter-unwrap (T), bukan envelope.
      setData(await api.get<OwnerOverview>('/balaundry/owner/overview'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat, coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;

  // ── Auth gate inline (mirror owner/bakos L48-67 — bukan auto-redirect) ──
  if (!user) {
    return (
      <FullScreen>
        <div className="text-center px-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ background: 'var(--color-balaundry-muted)' }}
          >
            <Icon name="login" size={26} style={{ color: 'var(--color-balaundry)' }} />
          </div>
          <p className="text-sm font-semibold text-slate-800">Masuk dulu untuk kelola laundry</p>
          <p className="text-xs mt-1 mb-4 text-slate-500">Kelola outlet laundry kamu dari sini.</p>
          <button
            onClick={() => router.push('/login?redirect=/owner/balaundry')}
            className="text-xs font-semibold px-5 py-2.5 rounded-xl text-white active:scale-95 transition-transform"
            style={{ background: 'var(--color-balaundry)' }}
          >
            Masuk
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-balaundry-muted)' }}
          >
            <Icon name="local_laundry_service" size={20} style={{ color: 'var(--color-balaundry)' }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight leading-tight text-slate-900">Laundry Saya</h1>
            <p className="text-[13px] text-slate-500">Kelola outlet laundry kamu</p>
          </div>
        </div>

        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <div className="rounded-2xl p-4 flex items-start gap-3 bg-red-50 border border-red-200">
            <Icon name="error" size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* 1. Kartu subscription */}
            <SubscriptionCard
              data={data}
              onManage={() => router.push('/owner/balaundry/langganan')}
            />

            {/* 2. Summary stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard icon="storefront" label="Total outlet" value={data.summary.businesses_total} />
              <StatCard icon="pending_actions" label="Order aktif" value={data.summary.orders_active} />
              <StatCard icon="today" label="Order hari ini" value={data.summary.orders_today} />
              <StatCard icon="groups" label="Total staff" value={data.summary.staff_total} />
              <div className="col-span-2">
                <StatCard
                  icon="payments"
                  label="Pendapatan selesai"
                  value={formatRupiah(data.summary.revenue_completed)}
                  wide
                />
              </div>
            </div>

            {/* 3. Daftar outlet / empty state */}
            <div className="mt-6">
              {data.businesses.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-white border border-slate-200">
                  <Icon name="add_business" size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-800">Belum ada outlet</p>
                  <p className="text-xs mt-1 mb-4 text-slate-500">Daftarkan outlet laundry pertamamu untuk mulai.</p>
                  <button
                    onClick={() => router.push('/owner/balaundry/outlet/baru')}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl text-white active:scale-95 transition-transform"
                    style={{ background: 'var(--color-balaundry)' }}
                  >
                    <Icon name="add" size={16} /> Daftarkan Outlet
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest px-1 text-slate-400">
                    {data.businesses.length} outlet
                  </p>
                  {data.businesses.map((biz) => (
                    <OutletCard
                      key={biz.id}
                      biz={biz}
                      onClick={() => router.push(`/owner/balaundry/outlet/${biz.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Kartu subscription ─────────────────────────────────────── */

function SubscriptionCard({ data, onManage }: { data: OwnerOverview; onManage: () => void }) {
  const { subscription: sub } = data;
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Paket langganan</p>
          <p className="text-xl font-bold leading-tight mt-0.5 capitalize text-slate-900">{sub.tier}</p>
          <p className="text-[11px] mt-1 text-slate-500">Status DB: {sub.db_status}</p>
        </div>
        <StatusBadge expired={sub.is_expired} />
      </div>

      {sub.paid_until && (
        <p className="text-[11px] mt-3 text-slate-400">
          Aktif sampai {formatTanggal(sub.paid_until)}
        </p>
      )}

      <button
        onClick={onManage}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border active:scale-[0.99] transition-transform"
        style={{ borderColor: 'var(--color-balaundry)', color: 'var(--color-balaundry)', background: 'var(--color-balaundry-muted)' }}
      >
        <Icon name="workspace_premium" size={16} /> Kelola Langganan
      </button>
    </div>
  );
}

function StatusBadge({ expired }: { expired: boolean }) {
  if (expired) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
        <Icon name="cancel" size={13} /> Expired
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
      <Icon name="check_circle" size={13} /> Aktif
    </span>
  );
}

/* ─── Kartu stat angka ───────────────────────────────────────── */

function StatCard({
  icon, label, value, wide,
}: { icon: string; label: string; value: string | number; wide?: boolean }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-slate-200">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={18} style={{ color: 'var(--color-balaundry)' }} />
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      </div>
      <p className={`mt-2 font-bold text-slate-900 ${wide ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

/* ─── Kartu outlet ───────────────────────────────────────────── */

function OutletCard({ biz, onClick }: { biz: OwnerBusinessCard; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 bg-white border border-slate-200 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate text-slate-900">{biz.name}</p>
          {biz.display_id && <p className="text-[11px] text-slate-400 mt-0.5">{biz.display_id}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {biz.is_verified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-balaundry-muted)', color: 'var(--color-balaundry)' }}>
              <Icon name="verified" size={12} /> Verified
            </span>
          )}
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            biz.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {biz.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1 mt-2">
        <Icon name="star" size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-slate-700">{biz.rating_avg}</span>
        <span className="text-[11px] text-slate-400">({biz.rating_count})</span>
      </div>

      {/* Metrik order + revenue */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MiniMetric label="Aktif" value={biz.orders_active} />
        <MiniMetric label="Hari ini" value={biz.orders_today} />
        <MiniMetric label="Selesai" value={biz.orders_completed} />
      </div>
      <p className="text-xs mt-3 text-slate-500">
        Pendapatan: <span className="font-semibold text-slate-800">{formatRupiah(biz.revenue_completed)}</span>
      </p>

      {/* Footer count */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Icon name="dry_cleaning" size={14} /> {biz.services_count} layanan
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Icon name="groups" size={14} /> {biz.staff_count} staff
        </span>
      </div>
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl py-2 text-center bg-slate-50">
      <p className="text-base font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

/* ─── Helpers UI ─────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-200" />)}
        <div className="col-span-2 h-20 rounded-2xl bg-slate-200" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-200" />)}
      </div>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50">{children}</div>;
}

function Spinner() {
  return (
    <Icon name="progress_activity" size={28} className="animate-spin" style={{ color: 'var(--color-balaundry)' }} />
  );
}

function Icon({
  name, size = 20, className, style,
}: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`material-symbols-outlined${className ? ` ${className}` : ''}`} style={{ fontSize: size, ...style }}>
      {name}
    </span>
  );
}

// WIT (Asia/Jayapura) — tanggal lokal.
function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jayapura',
    });
  } catch {
    return iso;
  }
}
