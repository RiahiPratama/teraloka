'use client';

/**
 * TeraLoka — Admin SOS Detail Page
 * Bridge Sprint Day 12 Step 7 Batch B2 (10 Mei 2026)
 * ------------------------------------------------------------
 * Detail page untuk single SOS call.
 *
 * Path: /admin/balapor/sos/[id]
 *
 * Layout:
 *   - Back button → /admin/balapor (Tab SOS)
 *   - 2-column desktop / stacked mobile:
 *     - Left: SosDetailView (forensic + audit timeline)
 *     - Right: SosMapView + SosDetailActions
 *
 * Note: Page ini standalone (BUKAN tab di command center) karena scope
 * detail terlalu kompleks untuk modal. Click row di Tab SOS list
 * → navigate ke page ini.
 */

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { SosDetailView } from '@/components/admin/reports/sos-detail-view';
import { SosMapView } from '@/components/admin/reports/sos-map-view';
import { SosDetailActions } from '@/components/admin/reports/sos-detail-actions';
import type { AdminSosCall } from '@/types/sos-admin';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminSosDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const api = useApi();

  const [sos, setSos] = useState<AdminSosCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminSosCall>(`/admin/balapor/sos/${id}`);
      setSos(data);
    } catch (err) {
      console.error('[SOS Detail] fetch error:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Gagal memuat detail SOS';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  // ─── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--color-background)' }}
      >
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'var(--color-balapor)' }}
        />
        <p
          className="text-sm mt-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Memuat detail SOS...
        </p>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────
  if (error || !sos) {
    return (
      <div
        className="min-h-screen p-4"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="max-w-2xl mx-auto pt-8">
          <Link
            href="/admin/balapor"
            className="inline-flex items-center gap-1.5 text-sm font-bold mb-4 hover:underline"
            style={{ color: 'var(--color-balapor)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke BALAPOR Command Center
          </Link>

          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-status-critical)',
            }}
          >
            <h1
              className="text-lg font-extrabold mb-2"
              style={{ color: 'var(--color-status-critical)' }}
            >
              SOS Tidak Ditemukan
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {error || 'Data SOS tidak tersedia'}
            </p>
            <p
              className="text-xs mt-2 font-mono"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ID: {id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success State ─────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header navigation */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/admin/balapor"
            className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
            style={{ color: 'var(--color-balapor)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Tab SOS
          </Link>

          <button
            type="button"
            onClick={() => void fetchDetail()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
            Refresh
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Detail View (2 col) */}
          <div className="lg:col-span-2">
            <SosDetailView sos={sos} />
          </div>

          {/* Right: Map + Actions (1 col) */}
          <div className="space-y-4">
            <SosMapView sos={sos} height={320} />
            <SosDetailActions sos={sos} onUpdated={setSos} />
          </div>
        </div>
      </div>
    </div>
  );
}
