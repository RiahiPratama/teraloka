'use client';

/**
 * TeraLoka — Admin Ticker
 * ------------------------------------------------------------
 * Kelola ticker + antrian verifikasi. Konsumsi kontrak backend baru
 * (taxonomy 2-field urgensi × kategori + atribusi + TTL + review_status).
 *
 *   list   → GET   /admin/ticker?review_status=&kategori=&urgensi=
 *   create → POST  /ticker                (via TickerFormModal)
 *   edit   → PATCH /admin/ticker/:id      (via TickerFormModal)
 *   approve/reject → PATCH /admin/ticker/:id { review_status }
 *   kill-switch    → PATCH /admin/ticker/:id { is_active }
 *
 * Styling: AAP semantic tokens + reuse <Badge>. Dead local route
 * src/app/api/v1/ticker/route.ts TIDAK dipakai (FE konsumsi backend eksternal).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlignJustify,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Power,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UrgensiBadge,
  KategoriBadge,
} from '@/components/admin/ticker/ticker-badges';
import { TickerFormModal } from '@/components/admin/ticker/ticker-form-modal';
import { TICKER_URGENSI, TICKER_KATEGORI } from '@/utils/constants';
import { formatDate, formatTime, formatRelative } from '@/utils/format';
import type {
  AdminTickerItem,
  TickerReviewStatus,
  TickerUrgensi,
  TickerKategori,
} from '@/types/common';

/* ─── Filter options ─── */
const REVIEW_OPTIONS: { value: '' | TickerReviewStatus; label: string }[] = [
  { value: '', label: 'Semua status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function isExpired(item: AdminTickerItem): boolean {
  if (!item.expires_at) return false;
  const d = new Date(item.expires_at).getTime();
  return !Number.isNaN(d) && d < Date.now();
}

const selectCls =
  'px-3 py-2 rounded-lg border border-border bg-surface ' +
  'text-[12px] font-semibold text-text cursor-pointer outline-none ' +
  'focus:border-brand-teal transition-colors';

export default function AdminTickerPage() {
  const { token } = useAuth();
  const api = useApi();

  const [items, setItems] = useState<AdminTickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [reviewFilter, setReviewFilter] = useState<'' | TickerReviewStatus>('');
  const [kategoriFilter, setKategoriFilter] = useState<'' | TickerKategori>('');
  const [urgensiFilter, setUrgensiFilter] = useState<'' | TickerUrgensi>('');

  const [modal, setModal] = useState<{ item: AdminTickerItem | null } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminTickerItem[]>('/admin/ticker', {
        params: {
          review_status: reviewFilter || undefined,
          kategori: kategoriFilter || undefined,
          urgensi: urgensiFilter || undefined,
        },
      });
      setItems(data ?? []);
    } catch (e) {
      showToast(
        e instanceof ApiError ? e.message : 'Gagal memuat ticker.',
        false
      );
    } finally {
      setLoading(false);
    }
  }, [api, reviewFilter, kategoriFilter, urgensiFilter, showToast]);

  useEffect(() => {
    if (token) fetchItems();
  }, [token, fetchItems]);

  /* ─── Actions (PATCH) ─── */
  const patchItem = async (
    id: string,
    body: Partial<Pick<AdminTickerItem, 'review_status' | 'is_active'>>,
    okMsg: string
  ) => {
    setProcessing(id);
    try {
      await api.patch(`/admin/ticker/${id}`, body);
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...body } : it))
      );
      showToast(okMsg, true);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Gagal memproses.', false);
    } finally {
      setProcessing(null);
    }
  };

  const approve = (id: string) =>
    patchItem(id, { review_status: 'approved' }, 'Item di-approve.');
  const reject = (id: string) =>
    patchItem(id, { review_status: 'rejected' }, 'Item ditolak.');
  const toggleActive = (it: AdminTickerItem) =>
    patchItem(
      it.id,
      { is_active: !it.is_active },
      it.is_active ? 'Item dimatikan (kill-switch).' : 'Item diaktifkan.'
    );

  const onSaved = (msg: string) => {
    setModal(null);
    showToast(msg, true);
    fetchItems();
  };

  /* ─── Derived ─── */
  const pending = items.filter((it) => it.review_status === 'pending');
  const others = items.filter((it) => it.review_status !== 'pending');

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-[60] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm',
              toast.ok ? 'bg-status-healthy text-white' : 'bg-status-critical text-white'
            )}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <AlignJustify size={24} className="text-brand-teal" />
            News Ticker
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {loading ? 'Memuat…' : `${items.length} item · ${pending.length} menunggu verifikasi`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={13} />}
            onClick={fetchItems}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setModal({ item: null })}
          >
            Tambah
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-surface border border-border rounded-xl">
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value as '' | TickerReviewStatus)}
          className={selectCls}
        >
          {REVIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={urgensiFilter}
          onChange={(e) => setUrgensiFilter(e.target.value as '' | TickerUrgensi)}
          className={selectCls}
        >
          <option value="">Semua urgensi</option>
          {(Object.keys(TICKER_URGENSI) as TickerUrgensi[]).map((u) => (
            <option key={u} value={u}>
              {TICKER_URGENSI[u].label}
            </option>
          ))}
        </select>
        <select
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value as '' | TickerKategori)}
          className={selectCls}
        >
          <option value="">Semua kategori</option>
          {(Object.keys(TICKER_KATEGORI) as TickerKategori[]).map((k) => (
            <option key={k} value={k}>
              {TICKER_KATEGORI[k].label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-text-muted text-sm">Memuat ticker…</div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="rounded-xl bg-surface border border-border p-12 text-center">
          <p className="text-sm text-text-muted">
            Tidak ada item ticker untuk filter ini.
          </p>
        </div>
      )}

      {/* Antrian verifikasi (pending) */}
      {!loading && pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wide flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-warning" />
            Antrian Verifikasi ({pending.length})
          </h2>
          {pending.map((it) => (
            <TickerCard
              key={it.id}
              item={it}
              processing={processing === it.id}
              onApprove={() => approve(it.id)}
              onReject={() => reject(it.id)}
              onToggleActive={() => toggleActive(it)}
              onEdit={() => setModal({ item: it })}
            />
          ))}
        </section>
      )}

      {/* Item lain */}
      {!loading && others.length > 0 && (
        <section className="space-y-2">
          {pending.length > 0 && (
            <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wide">
              Item Lain
            </h2>
          )}
          {others.map((it) => (
            <TickerCard
              key={it.id}
              item={it}
              processing={processing === it.id}
              onApprove={() => approve(it.id)}
              onReject={() => reject(it.id)}
              onToggleActive={() => toggleActive(it)}
              onEdit={() => setModal({ item: it })}
            />
          ))}
        </section>
      )}

      {/* Form modal */}
      {modal && (
        <TickerFormModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

/* ─── Item card ─── */
function TickerCard({
  item,
  processing,
  onApprove,
  onReject,
  onToggleActive,
  onEdit,
}: {
  item: AdminTickerItem;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
}) {
  const expired = isExpired(item);
  const isPending = item.review_status === 'pending';

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-3.5',
        item.is_active && !expired ? 'border-border' : 'border-border opacity-60'
      )}
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <UrgensiBadge urgensi={item.urgensi} />
        <KategoriBadge kategori={item.kategori} />
        {item.review_status === 'approved' && (
          <Badge variant="status" status="healthy" size="sm">Approved</Badge>
        )}
        {item.review_status === 'pending' && (
          <Badge variant="status" status="warning" size="sm">Pending</Badge>
        )}
        {item.review_status === 'rejected' && (
          <Badge variant="status" status="neutral" size="sm">Rejected</Badge>
        )}
        {expired ? (
          <Badge variant="status" status="neutral" size="sm">Expired</Badge>
        ) : !item.is_active ? (
          <Badge variant="status" status="neutral" size="sm">Nonaktif</Badge>
        ) : null}
      </div>

      {/* Text */}
      <p className="text-sm text-text leading-snug">{item.text}</p>

      {/* Meta: atribusi + TTL */}
      <div className="mt-2 flex flex-col gap-1 text-[11px] text-text-muted">
        {item.source_name && (
          <span className="flex items-center gap-1 flex-wrap">
            Sumber:{' '}
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-status-info font-semibold inline-flex items-center gap-0.5 hover:underline"
              >
                {item.source_name}
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="font-semibold text-text-secondary">{item.source_name}</span>
            )}
            {item.source_timestamp && <span>· {formatRelative(item.source_timestamp)}</span>}
          </span>
        )}
        {item.expires_at && (
          <span className={cn(expired && 'text-status-critical font-semibold')}>
            Kedaluwarsa: {formatDate(item.expires_at)} {formatTime(item.expires_at)}
            {expired && ' (expired)'}
          </span>
        )}
        {item.link && (
          <a
            href={item.link}
            target={item.link.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="text-status-info inline-flex items-center gap-0.5 hover:underline w-fit"
          >
            Buka link <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {isPending && (
          <>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check size={13} />}
              onClick={onApprove}
              loading={processing}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<X size={13} />}
              onClick={onReject}
              disabled={processing}
            >
              Reject
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Pencil size={13} />}
          onClick={onEdit}
          disabled={processing}
        >
          Edit
        </Button>
        <Button
          variant={item.is_active ? 'secondary' : 'primary'}
          size="sm"
          leftIcon={<Power size={13} />}
          onClick={onToggleActive}
          disabled={processing}
        >
          {item.is_active ? 'Matikan' : 'Aktifkan'}
        </Button>
      </div>
    </div>
  );
}
