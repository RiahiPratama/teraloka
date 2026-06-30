'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — Command Center (Overview)
// PATH: src/app/admin/balaundry/page.tsx
// GET /admin/balaundry/overview via useApi() (auto Bearer JWT).
// WAJAH only — render metrik apa adanya, NOL business logic di FE.
// Highlight pending_verify (aksen balaundry-surya) + CTA "Verifikasi sekarang".
// Tahap A: CTA & daftar laundry belum live (Tahap B) → CTA disabled "segera".
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useApi, ApiError } from '@/lib/api/client';
import type { OverviewStats } from '@/lib/balaundry-links';
import { MetricCard } from '@/components/balaundry/admin/MetricCard';

export default function BalaundryCommandCenter() {
  const api = useApi();
  const [data, setData] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<OverviewStats>('/admin/balaundry/overview', {
          signal: ac.signal,
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        if (e instanceof ApiError) {
          if (e.code === 'AUTH_FORBIDDEN' || e.status === 403) {
            setError('Akses admin diperlukan untuk membuka command center.');
          } else if (e.status === 401) {
            setError('Sesi berakhir. Silakan login ulang.');
          } else {
            setError(e.message || 'Gagal memuat data overview.');
          }
        } else {
          setError('Gagal memuat data overview.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [api, reloadKey]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">
            <span className="material-symbols-outlined text-balaundry">local_laundry_service</span>
            Command Center BALAUNDRY
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Ringkasan laundry, pesanan, layanan & staf seluruh platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Muat ulang
        </button>
      </div>

      {/* ── Error state ── */}
      {error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="material-symbols-outlined text-text-subtle">error</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-balaundry hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-6">
          <Section title="Laundry">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <MetricCard key={i} icon="" label="" value="" loading />
              ))}
            </div>
          </Section>
          <Section title="Pesanan">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <MetricCard key={i} icon="" label="" value="" loading />
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Data ── */}
      {!loading && !error && data && (
        <div className="space-y-6">
          <Section title="Laundry">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetricCard icon="storefront" label="Total laundry" value={data.businesses.total} />
              <MetricCard icon="verified" label="Terverifikasi" value={data.businesses.verified} />
              <MetricCard
                icon="pending_actions"
                label="Menunggu verifikasi"
                value={data.businesses.pending_verify}
                highlight
                action={
                  <span
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-subtle"
                    title="Daftar verifikasi tersedia di tahap berikutnya"
                  >
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    Verifikasi sekarang
                    <span className="rounded bg-surface px-1 py-0.5 text-[9px] uppercase">soon</span>
                  </span>
                }
              />
              <MetricCard icon="check_circle" label="Aktif" value={data.businesses.active} />
              <MetricCard icon="do_not_disturb_on" label="Nonaktif" value={data.businesses.inactive} />
            </div>
          </Section>

          <Section title="Pesanan">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon="receipt_long" label="Total pesanan" value={data.orders.total} />
              <MetricCard icon="autorenew" label="Berjalan" value={data.orders.active} />
              <MetricCard icon="task_alt" label="Selesai" value={data.orders.completed} />
              <MetricCard icon="today" label="Hari ini" value={data.orders.today} />
            </div>
          </Section>

          <Section title="Lainnya">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon="dry_cleaning" label="Total layanan" value={data.services_total} />
              <MetricCard icon="groups" label="Total staf" value={data.staff_total} />
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}
