'use client';

/**
 * TeraLoka — AdPreviewModal
 * Sub-Phase 8-E-6 Mini C (17 Mei 2026)
 * ------------------------------------------------------------
 * Hybrid preview modal — visual preview + metadata + audit trail.
 *
 * Layout (3 sections):
 *   1. Visual Preview — render iklan seperti yang user akan lihat
 *      - image format: thumbnail + title + body card
 *      - text/advertorial: text card dengan disclaimer
 *      - DCA: frame carousel (kalau ada >=2 frames)
 *   2. Metadata — display_id, status, dates, positions, regions, billing
 *   3. Performance + Audit Trail — impressions/CTR + recent activity timeline
 *
 * Edit capability: VIEW-ONLY (Q3=a). Tombol "Edit Detail" → jump ke /admin/ads/[id]/edit
 *
 * Data source: GET /admin/ads/detail/:id
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X, Eye, Pencil, ChevronLeft, ChevronRight,
  Image as ImageIcon, ExternalLink, MapPin,
  Calendar, BarChart3, Clock, User, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/ads/markdown';  // SESI 7 — Phase 7 Advertorial

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────────

interface AdDetailData {
  ad: {
    id:                  string;
    display_id?:         string | null;
    title:               string | null;
    body:                string | null;
    image_url:           string | null;
    cover_image_caption?: string | null;  // SESI 7 — Advertorial cover caption
    link_url:            string | null;
    advertiser_name:     string;
    advertiser_logo_url: string | null;
    advertiser_type:     string;
    positions:           string[];
    target_regions:      string[] | null;
    creative_frames:     any[] | null;
    ad_format:           string;
    status:              string;
    starts_at:           string;
    ends_at:             string;
    impression_count:    number;
    click_count:         number;
    view_count:          number;
    billing_model:       string | null;
    disclaimer_text?:    string | null;
    rejection_reason:    string | null;
    delete_reason:       string | null;
    deleted_at:          string | null;
    created_at:          string;
    updated_at:          string;
  };
  audit_history: Array<{
    id:         string;
    action:     string;
    old_data:   any;
    new_data:   any;
    created_at: string;
    user: {
      id:   string;
      name: string;
      role: string;
    };
  }>;
  audit_pagination: {
    limit:    number;
    has_more: boolean;
  };
  metrics: {
    ctr:           number | null;
    days_active?:  number | null;
    impressions:   number;
    clicks:        number;
  };
}

export interface AdPreviewModalProps {
  adId: string | null;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────

export default function AdPreviewModal({ adId, onClose }: AdPreviewModalProps) {
  const { token } = useAuth();
  const [data, setData]               = useState<AdDetailData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Fetch detail saat modal open
  useEffect(() => {
    if (!adId || !token) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCurrentFrame(0);

    fetch(`${API}/admin/ads/detail/${adId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !json.data) {
          setError(json.error?.message ?? 'Gagal memuat detail iklan');
          return;
        }
        setData(json.data);
      })
      .catch((err) => setError(err?.message ?? 'Network error'))
      .finally(() => setLoading(false));
  }, [adId, token]);

  if (!adId) return null;

  // DCA frame management
  const isDCA = Array.isArray(data?.ad.creative_frames) && data!.ad.creative_frames.length >= 2;
  const frames = (data?.ad.creative_frames ?? []) as Array<{ image_url?: string; title?: string; body?: string }>;
  const currentFrameData = isDCA ? frames[currentFrame] : null;

  const displayImage = isDCA
    ? (currentFrameData?.image_url ?? data?.ad.image_url)
    : data?.ad.image_url;
  const displayTitle = isDCA
    ? (currentFrameData?.title ?? data?.ad.title)
    : data?.ad.title;
  const displayBody = isDCA
    ? (currentFrameData?.body ?? data?.ad.body)
    : data?.ad.body;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* SESI 7 — Phase 7 Advertorial markdown styling */}
      <style jsx>{`
        :global(.advertorial-body h1) {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 1.25rem 0 0.75rem;
          line-height: 1.2;
        }
        :global(.advertorial-body h2) {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.625rem;
          line-height: 1.3;
        }
        :global(.advertorial-body h3) {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0.875rem 0 0.5rem;
          line-height: 1.4;
        }
        :global(.advertorial-body p) {
          margin: 0.625rem 0;
        }
        :global(.advertorial-body strong) {
          font-weight: 700;
        }
        :global(.advertorial-body em) {
          font-style: italic;
        }
        :global(.advertorial-body blockquote) {
          border-left: 3px solid var(--color-ads, #f59e0b);
          padding-left: 0.875rem;
          margin: 0.875rem 0;
          font-style: italic;
          opacity: 0.85;
        }
        :global(.advertorial-body ul),
        :global(.advertorial-body ol) {
          padding-left: 1.5rem;
          margin: 0.625rem 0;
        }
        :global(.advertorial-body ul) {
          list-style: disc;
        }
        :global(.advertorial-body ol) {
          list-style: decimal;
        }
        :global(.advertorial-body li) {
          margin: 0.25rem 0;
        }
        :global(.advertorial-body a) {
          color: var(--color-ads, #f59e0b);
          text-decoration: underline;
        }
        :global(.advertorial-body img) {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.875rem 0;
          display: block;
        }
        :global(.advertorial-body figure) {
          margin: 1rem 0;
        }
        :global(.advertorial-body figcaption) {
          font-size: 0.75rem;
          text-align: center;
          opacity: 0.7;
          margin-top: 0.25rem;
          font-style: italic;
        }
      `}</style>

      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ads/12 text-ads shrink-0">
              <Eye size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-text">
                Preview Iklan
              </h3>
              {data?.ad.display_id && (
                <p className="text-[11px] font-mono text-text-muted mt-0.5">
                  {data.ad.display_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {adId && (
              <Link
                href={`/admin/ads/${adId}/edit`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-baronda text-white text-[11px] font-bold uppercase tracking-wide hover:bg-baronda/90 transition-colors"
              >
                <Pencil size={11} />
                Edit Detail
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-muted transition-colors"
              title="Tutup"
            >
              <X size={16} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-ads border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="m-5 p-4 rounded-lg bg-status-critical/8 border border-status-critical/30 flex items-center gap-3">
              <AlertCircle size={18} className="text-status-critical shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-status-critical">
                  Gagal memuat detail
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="flex flex-col gap-5 p-5">
              {/* ─── Section 1: Visual Preview ─── */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <ImageIcon size={11} />
                  Visual Preview
                  {isDCA && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-ads-muted text-ads-strong">
                      DCA {frames.length}f · Frame {currentFrame + 1}/{frames.length}
                    </span>
                  )}
                </h4>

                <div className="bg-surface-muted/40 rounded-lg overflow-hidden border border-border">
                  {/* SESI 7 — Phase 7 Advertorial Layout (full-width, markdown body) */}
                  {data.ad.ad_format === 'text' ? (
                    <article className="advertorial-preview">
                      {/* Cover Image — full width */}
                      {data.ad.image_url ? (
                        <figure className="advertorial-cover">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data.ad.image_url}
                            alt={data.ad.cover_image_caption ?? data.ad.title ?? ''}
                            className="w-full h-auto max-h-[400px] object-cover"
                          />
                          {data.ad.cover_image_caption && (
                            <figcaption className="text-[11px] italic text-text-muted text-center px-4 py-2 bg-surface/50">
                              {data.ad.cover_image_caption}
                            </figcaption>
                          )}
                        </figure>
                      ) : (
                        <div className="w-full h-48 bg-surface flex items-center justify-center text-text-subtle">
                          <ImageIcon size={32} />
                          <span className="ml-2 text-[11px] italic">Belum ada cover image</span>
                        </div>
                      )}

                      {/* Header — advertiser + IKLAN badge */}
                      <header className="px-5 pt-4 pb-2 flex items-center gap-2 flex-wrap">
                        {data.ad.advertiser_logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={data.ad.advertiser_logo_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                          {data.ad.advertiser_name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/12 text-amber-600 dark:text-amber-400">
                          IKLAN
                        </span>
                      </header>

                      {/* Title — large headline */}
                      <h2 className="px-5 text-[20px] font-extrabold text-text leading-tight mb-3">
                        {data.ad.title ?? '(Belum ada judul)'}
                      </h2>

                      {/* Body — markdown rendered */}
                      {data.ad.body ? (
                        <div
                          className="advertorial-body px-5 pb-4 text-[13px] text-text leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(data.ad.body) }}
                        />
                      ) : (
                        <p className="px-5 pb-4 text-[12px] italic text-text-muted">
                          (Belum ada body content)
                        </p>
                      )}

                      {/* CTA Link */}
                      {data.ad.link_url && (
                        <div className="px-5 pb-4">
                          <a
                            href={data.ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-ads/10 text-ads text-[12px] font-bold hover:bg-ads/20 transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate max-w-[400px]">{data.ad.link_url}</span>
                          </a>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {data.ad.disclaimer_text && (
                        <div className="px-5 pb-4">
                          <p className="text-[10px] italic text-text-subtle">
                            ⚠ {data.ad.disclaimer_text}
                          </p>
                        </div>
                      )}
                    </article>
                  ) : (
                    /* Existing horizontal card layout — image/video/dca/animated formats */
                    <div className="p-4 flex gap-3">
                      {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayImage}
                          alt=""
                          className="w-32 h-32 rounded-lg object-cover bg-surface shrink-0"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-lg bg-surface flex items-center justify-center shrink-0 text-text-subtle">
                          <ImageIcon size={32} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 flex flex-col">
                        {/* Advertiser branding */}
                        <div className="flex items-center gap-2 mb-1">
                          {data.ad.advertiser_logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={data.ad.advertiser_logo_url}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          )}
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                            {data.ad.advertiser_name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/12 text-amber-600 dark:text-amber-400">
                            IKLAN
                          </span>
                        </div>

                        <h5 className="text-[14px] font-extrabold text-text leading-snug">
                          {displayTitle ?? '(no title)'}
                        </h5>

                        {displayBody && (
                          <p className="text-[12px] text-text-muted mt-1 line-clamp-3">
                            {displayBody}
                          </p>
                        )}

                        {data.ad.link_url && (
                          <a
                            href={data.ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-ads hover:underline mt-auto pt-2"
                          >
                            <ExternalLink size={10} />
                            <span className="truncate max-w-[300px]">{data.ad.link_url}</span>
                          </a>
                        )}

                        {data.ad.disclaimer_text && (
                          <p className="text-[10px] italic text-text-subtle mt-1.5 line-clamp-2">
                            ⚠ {data.ad.disclaimer_text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DCA frame controls — only for DCA format */}
                  {isDCA && data.ad.ad_format !== 'text' && (
                    <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border bg-surface">
                      <button
                        type="button"
                        onClick={() => setCurrentFrame((p) => Math.max(0, p - 1))}
                        disabled={currentFrame === 0}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
                          currentFrame === 0
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-surface-muted'
                        )}
                      >
                        <ChevronLeft size={12} />
                        Prev
                      </button>

                      <div className="flex items-center gap-1">
                        {frames.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentFrame(idx)}
                            className={cn(
                              'w-2 h-2 rounded-full transition-colors',
                              idx === currentFrame ? 'bg-ads' : 'bg-text-subtle hover:bg-text-muted'
                            )}
                            title={`Frame ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentFrame((p) => Math.min(frames.length - 1, p + 1))}
                        disabled={currentFrame === frames.length - 1}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
                          currentFrame === frames.length - 1
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-surface-muted'
                        )}
                      >
                        Next
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* ─── Section 2: Metadata ─── */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Metadata
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <MetaCell label="Status" value={
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase',
                      getStatusColor(data.ad.status)
                    )}>
                      {data.ad.status}
                    </span>
                  } />
                  <MetaCell label="Format" value={
                    <span className="capitalize text-[11px] font-semibold text-text">
                      {data.ad.ad_format}{isDCA ? ` · DCA ${frames.length}f` : ''}
                    </span>
                  } />
                  <MetaCell label="Tipe Advertiser" value={
                    <span className="capitalize text-[11px] font-semibold text-text">
                      {data.ad.advertiser_type}
                    </span>
                  } />
                  <MetaCell label="Billing Model" value={
                    <span className="text-[11px] font-semibold text-text">
                      {data.ad.billing_model ?? '—'}
                    </span>
                  } />
                  <MetaCell label="Mulai" icon={<Calendar size={10} />} value={
                    <span className="text-[11px] font-semibold text-text">
                      {formatDate(data.ad.starts_at)}
                    </span>
                  } />
                  <MetaCell label="Berakhir" icon={<Calendar size={10} />} value={
                    <span className="text-[11px] font-semibold text-text">
                      {formatDate(data.ad.ends_at)}
                    </span>
                  } />
                  <MetaCell label="Posisi" colSpan={2} value={
                    <div className="flex flex-wrap gap-1">
                      {data.ad.positions.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-bakabar/10 text-bakabar">
                          {p}
                        </span>
                      ))}
                    </div>
                  } />
                  <MetaCell label="Target Region" icon={<MapPin size={10} />} colSpan={2} value={
                    data.ad.target_regions === null ? (
                      <span className="text-[11px] italic text-text-muted">Semua region (universal)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {data.ad.target_regions.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-baronda/10 text-baronda">
                            {r}
                          </span>
                        ))}
                      </div>
                    )
                  } />

                  {data.ad.rejection_reason && (
                    <MetaCell label="Alasan Reject" colSpan={2} value={
                      <span className="text-[11px] italic text-balapor">
                        {data.ad.rejection_reason}
                      </span>
                    } />
                  )}

                  {data.ad.delete_reason && (
                    <MetaCell label="Alasan Hapus" colSpan={2} value={
                      <span className="text-[11px] italic text-balapor">
                        {data.ad.delete_reason}
                      </span>
                    } />
                  )}
                </div>
              </section>

              {/* ─── Section 3: Performance ─── */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <BarChart3 size={11} />
                  Performance
                </h4>

                <div className="grid grid-cols-3 gap-2.5">
                  <PerfCell label="Impressions" value={formatNum(data.ad.impression_count)} />
                  <PerfCell label="Clicks" value={formatNum(data.ad.click_count)} />
                  <PerfCell
                    label="CTR"
                    value={data.metrics.ctr !== null ? `${(data.metrics.ctr * 100).toFixed(2)}%` : '—'}
                  />
                </div>
              </section>

              {/* ─── Section 4: Audit Trail ─── */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Clock size={11} />
                  Audit Timeline ({data.audit_history.length}
                  {data.audit_pagination.has_more ? '+' : ''})
                </h4>

                {data.audit_history.length === 0 ? (
                  <p className="text-[11px] italic text-text-muted px-3 py-2">
                    Belum ada audit log
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {data.audit_history.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-muted/40 border border-border"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ads/12 text-ads shrink-0">
                          <User size={10} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-text">
                              {entry.user.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface text-text-muted">
                              {entry.user.role}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-ads/12 text-ads">
                              {entry.action}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {formatDateTime(entry.created_at)}
                          </p>
                          {entry.new_data && Object.keys(entry.new_data).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text">
                                Detail perubahan
                              </summary>
                              <pre className="text-[10px] text-text-muted mt-1 bg-surface p-2 rounded overflow-x-auto">
                                {JSON.stringify(entry.new_data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────

function MetaCell({
  label,
  value,
  icon,
  colSpan = 1,
}: {
  label:   string;
  value:   React.ReactNode;
  icon?:   React.ReactNode;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={cn(
      'flex flex-col gap-1 px-3 py-2 rounded-lg bg-surface-muted/40 border border-border',
      colSpan === 2 && 'col-span-2'
    )}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
        {icon}
        {label}
      </span>
      {value}
    </div>
  );
}

function PerfCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-ads/8 border border-ads/20">
      <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-[16px] font-extrabold text-text tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':          return 'bg-status-healthy/12 text-status-healthy';
    case 'paused':          return 'bg-status-info/12 text-status-info';
    case 'pending_review':  return 'bg-status-critical/12 text-status-critical';
    case 'pending_payment': return 'bg-status-warning/12 text-status-warning';
    case 'rejected':        return 'bg-balapor/12 text-balapor';
    case 'expired':         return 'bg-surface-muted text-text-muted';
    case 'deleted':         return 'bg-balapor/12 text-balapor';
    default:                return 'bg-surface-muted text-text-muted';
  }
}
