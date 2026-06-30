'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Detail outlet (Tahap B)
// PATH: src/app/owner/balaundry/outlet/[bizId]/page.tsx
// ────────────────────────────────────────────────────────────────
// GET /balaundry/owner/businesses/:bizId/dashboard → status_breakdown +
// revenue + payment + recent_orders. WAJAH only — angka apa adanya.
// 403 → "Bukan outlet Anda". useApi (Bearer auto). Material Symbols.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { formatRupiah, statusLabel } from '@/lib/balaundry-links';
import { Icon, Spinner, FullScreen, AuthGate, statusToneClass, formatTanggalWIT } from '@/components/balaundry/owner/ui';
import type { BusinessDashboard } from '@/components/balaundry/owner/types';

export default function OutletDetailPage() {
  const { bizId } = useParams<{ bizId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [data, setData] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null); setForbidden(false);
      setData(await api.get<BusinessDashboard>(`/balaundry/owner/businesses/${bizId}/dashboard`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) { setForbidden(true); }
      else setError(e instanceof ApiError ? e.message : 'Gagal memuat, coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [api, bizId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;
  if (!user) return <AuthGate redirect={`/owner/balaundry/outlet/${bizId}`} message="Masuk dulu untuk kelola laundry" />;

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        {/* Back */}
        <button
          onClick={() => router.push('/owner/balaundry')}
          className="flex items-center gap-1 text-xs mb-3 text-slate-500 hover:opacity-70 transition-opacity"
        >
          <Icon name="chevron_left" size={16} /> Laundry Saya
        </button>

        <h1 className="text-[22px] font-bold tracking-tight leading-tight text-slate-900 mb-5">Detail Outlet</h1>

        {loading && <DetailSkeleton />}

        {!loading && forbidden && (
          <div className="py-16 text-center rounded-2xl bg-white border border-slate-200">
            <Icon name="lock" size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-800">Bukan outlet Anda</p>
            <p className="text-xs mt-1 text-slate-500">Outlet ini bukan milik akun kamu.</p>
          </div>
        )}

        {!loading && !forbidden && error && (
          <div className="rounded-2xl p-4 flex items-start gap-3 bg-red-50 border border-red-200">
            <Icon name="error" size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !forbidden && !error && data && (
          <div className="space-y-4">
            {/* Revenue */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Pendapatan</p>
              <p className="text-2xl font-bold mt-1 text-slate-900">{formatRupiah(data.revenue.completed_total)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total selesai</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <MiniStat label="Hari ini" value={formatRupiah(data.revenue.today)} />
                <MiniStat label="Bulan ini" value={formatRupiah(data.revenue.this_month)} />
              </div>
            </div>

            {/* Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <Icon name="check_circle" size={18} className="text-emerald-600" />
                  <p className="text-[11px] font-semibold text-slate-500">Lunas</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.payment.paid}</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <Icon name="pending" size={18} className="text-amber-600" />
                  <p className="text-[11px] font-semibold text-slate-500">Belum lunas</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{data.payment.unpaid}</p>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200">
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-3">Status order</p>
              {Object.keys(data.status_breakdown).length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada order.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.status_breakdown).map(([status, n]) => (
                    <span key={status} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusToneClass(status)}`}>
                      {statusLabel(status)}
                      <span className="font-bold">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200">
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-3">Order terbaru</p>
              {data.recent_orders.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada order.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recent_orders.map((o) => (
                    <div key={o.display_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{o.display_id}</p>
                        <p className="text-[11px] text-slate-400">{formatTanggalWIT(o.created_at, true)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusToneClass(o.order_status)}`}>
                          {statusLabel(o.order_status)}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{formatRupiah(o.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section links: services / staff / orders */}
            <div className="grid grid-cols-3 gap-3">
              <NavTile icon="dry_cleaning" label="Layanan" onClick={() => router.push(`/owner/balaundry/outlet/${bizId}/services`)} />
              <NavTile icon="groups" label="Staff" onClick={() => router.push(`/owner/balaundry/outlet/${bizId}/staff`)} />
              <NavTile icon="receipt_long" label="Order" onClick={() => router.push(`/owner/balaundry/outlet/${bizId}/orders`)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl py-2.5 px-3 bg-slate-50">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function NavTile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 bg-white border border-slate-200 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
    >
      <Icon name={icon} size={22} style={{ color: 'var(--color-balaundry)' }} />
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="h-20 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
    </div>
  );
}
