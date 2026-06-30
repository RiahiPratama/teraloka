'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Orders / POS (Tahap C2)
// PATH: src/app/owner/balaundry/outlet/[bizId]/orders/page.tsx
// ────────────────────────────────────────────────────────────────
// POST  /balaundry/owner/orders                  → POS create
// GET   /balaundry/owner/businesses/:bizId/orders?status&page&limit (DESC)
// GET   /balaundry/owner/orders/:orderId         → detail
// PATCH /balaundry/owner/orders/:orderId/status  {to_status, note?}
// 🔴🔴 HARGA 100% DARI BE. FE kirim service_id+qty saja. Total = response.total.
//      NOL kali qty×price, NOL sum subtotal di FE (OTAK principle).
// 🔴 Transisi status: BE validateTransition (14-status, maju only). to_status
//    dari ORDER_STATUS (links.ts), BUKAN list hardcode. 400 → "status tidak valid".
// useApi (Bearer auto). Material Symbols. Royal blue var(--color-balaundry).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, statusLabel, ORDER_STATUS } from '@/lib/balaundry-links';
import { Icon, Spinner, FullScreen, AuthGate, statusToneClass, formatTanggalWIT } from '@/components/balaundry/owner/ui';
import type { Order, OwnerService, StaffPublic, DeliveryMode, PaymentStatus } from '@/components/balaundry/owner/types';

const LIMIT = 20;
const DELIVERY: { v: DeliveryMode; label: string }[] = [
  { v: 'dropoff', label: 'Antar sendiri' },
  { v: 'pickup_delivery', label: 'Jemput & antar' },
];
const PAYMENT: { v: PaymentStatus; label: string }[] = [
  { v: 'unpaid', label: 'Belum bayar' },
  { v: 'paid', label: 'Lunas' },
];
const SELECT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-balaundry)]';
const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-balaundry)] focus:ring-2 focus:ring-[var(--color-balaundry-muted)] placeholder:text-slate-400';
const STATUS_KEYS = Object.keys(ORDER_STATUS); // 14-status dari links.ts (no hardcode)

export default function OrdersPage() {
  const { bizId } = useParams<{ bizId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const [list, setList] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [maybeMore, setMaybeMore] = useState(false); // heuristik: batch terakhir === LIMIT (meta di-strip useApi)

  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, status: string) => {
    return api.get<Order[]>(`/balaundry/owner/businesses/${bizId}/orders`, {
      params: { status: status || undefined, page: p, limit: LIMIT },
    });
  }, [api, bizId]);

  const load = useCallback(async (status: string) => {
    try {
      setLoading(true); setError(null); setForbidden(false);
      const batch = await fetchPage(1, status);
      setList(batch);
      setPage(1);
      setMaybeMore(batch.length === LIMIT);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError(e instanceof ApiError ? e.message : 'Gagal memuat, coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const batch = await fetchPage(next, statusFilter);
      setList((prev) => [...(prev ?? []), ...batch]);
      setPage(next);
      setMaybeMore(batch.length === LIMIT);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Gagal memuat lebih.');
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load(statusFilter);
  }, [authLoading, user, load, statusFilter]);

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;
  if (!user) return <AuthGate redirect={`/owner/balaundry/outlet/${bizId}/orders`} message="Masuk dulu untuk kelola order" />;

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button
          onClick={() => router.push(`/owner/balaundry/outlet/${bizId}`)}
          className="flex items-center gap-1 text-xs mb-3 text-slate-500 hover:opacity-70 transition-opacity"
        >
          <Icon name="chevron_left" size={16} /> Detail outlet
        </button>

        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Order</h1>
          {!forbidden && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white active:scale-95 transition-transform"
              style={{ background: 'var(--color-balaundry)' }}
            >
              <Icon name="add" size={16} /> Buat Order
            </button>
          )}
        </div>

        {/* Filter status */}
        {!forbidden && (
          <div className="mb-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={SELECT}>
              <option value="">Semua status</option>
              {STATUS_KEYS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
        )}

        {loading && <ListSkeleton />}

        {!loading && forbidden && (
          <EmptyBox icon="lock" title="Bukan outlet Anda" subtitle="Outlet ini bukan milik akun kamu." />
        )}

        {!loading && !forbidden && error && (
          <div className="rounded-2xl p-4 flex items-start gap-3 bg-red-50 border border-red-200">
            <Icon name="error" size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={() => load(statusFilter)} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !forbidden && !error && list && (
          list.length === 0 ? (
            <EmptyBox icon="receipt_long" title="Belum ada order" subtitle='Tap "Buat Order" untuk membuat order POS pertama.' />
          ) : (
            <div className="space-y-3">
              {list.map((o) => (
                <button key={o.id} onClick={() => setDetailId(o.id)} className="w-full text-left rounded-2xl p-4 bg-white border border-slate-200 active:scale-[0.99] transition-transform">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{o.display_id}</p>
                      <p className="text-[11px] text-slate-400">{formatTanggalWIT(o.created_at, true)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusToneClass(o.order_status)}`}>{statusLabel(o.order_status)}</span>
                      {/* total dari response BE — bukan hitungan FE */}
                      <span className="text-sm font-bold text-slate-900">{formatRupiah(o.total)}</span>
                    </div>
                  </div>
                </button>
              ))}

              {maybeMore && (
                <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-600 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {loadingMore ? <><Spinner size={14} /> Memuat…</> : 'Muat lebih'}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {showCreate && (
        <CreateOrderPanel
          bizId={bizId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(statusFilter); }}
        />
      )}

      {detailId && (
        <OrderDetailPanel
          orderId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={() => load(statusFilter)}
        />
      )}
    </div>
  );
}

/* ─── Create (POS) ───────────────────────────────────────────── */

function CreateOrderPanel({ bizId, onClose, onCreated }: { bizId: string; onClose: () => void; onCreated: () => void }) {
  const api = useApi();
  const { toast } = useToast();

  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [staff, setStaff] = useState<StaffPublic[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [staffId, setStaffId] = useState('');
  const [custName, setCustName] = useState('');
  const [custWa, setCustWa] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('dropoff');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Order | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingRefs(true); setLoadErr('');
        const [svc, stf] = await Promise.all([
          api.get<OwnerService[]>(`/balaundry/owner/businesses/${bizId}/services`),
          api.get<StaffPublic[]>(`/balaundry/owner/businesses/${bizId}/staff`),
        ]);
        if (!alive) return;
        setServices(svc.filter((s) => s.is_active));
        setStaff(stf.filter((s) => s.is_active));
      } catch (e) {
        if (alive) setLoadErr(e instanceof ApiError ? e.message : 'Gagal memuat layanan/staff.');
      } finally {
        if (alive) setLoadingRefs(false);
      }
    })();
    return () => { alive = false; };
  }, [api, bizId]);

  const items = (services ?? []).filter((s) => (qtyById[s.id] ?? 0) > 0);
  const canSubmit = items.length > 0;

  function setQty(id: string, delta: number) {
    setQtyById((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true); setError('');
    try {
      // 🔴 FE kirim service_id + qty (+note). NOL harga dikirim. BE recompute total.
      const order = await api.post<Order>('/balaundry/owner/orders', {
        business_id: bizId,
        items: items.map((s) => ({
          service_id: s.id,
          qty: qtyById[s.id],
          note: noteById[s.id]?.trim() || undefined,
        })),
        staff_id: staffId || undefined,
        customer_contact: (custName.trim() || custWa.trim())
          ? { name: custName.trim() || undefined, wa: custWa.replace(/\D/g, '') || undefined }
          : undefined,
        delivery_mode: deliveryMode,
        payment_status: paymentStatus,
      });
      setCreated(order); // tampilkan total dari RESPONSE
      toast.success('Order dibuat');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal membuat order. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={() => !submitting && (created ? onCreated() : onClose())} title={created ? 'Order Dibuat' : 'Buat Order POS'}>
      {created ? (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--color-balaundry-muted)' }}>
            <Icon name="check_circle" size={28} style={{ color: 'var(--color-balaundry)' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{created.display_id}</p>
            {/* 🔴 Total murni dari response BE */}
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-balaundry)' }}>{formatRupiah(created.total)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Total dihitung backend</p>
          </div>
          <button onClick={onCreated} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: 'var(--color-balaundry)' }}>Selesai</button>
        </div>
      ) : loadingRefs ? (
        <div className="py-10 flex justify-center"><Spinner /></div>
      ) : loadErr ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{loadErr}</p>
      ) : (services && services.length === 0) ? (
        <EmptyBox icon="dry_cleaning" title="Belum ada layanan aktif" subtitle="Tambah layanan dulu sebelum buat order." />
      ) : (
        <div className="space-y-4">
          {/* Service picker — tampil harga satuan katalog (display), TANPA subtotal */}
          <div>
            <p className="text-[13px] font-semibold text-slate-800 mb-2">Pilih layanan</p>
            <div className="space-y-2">
              {services!.map((s) => {
                const qty = qtyById[s.id] ?? 0;
                return (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{formatRupiah(s.price)} / {s.unit}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Stepper qty={qty} onDec={() => setQty(s.id, -1)} onInc={() => setQty(s.id, +1)} />
                      </div>
                    </div>
                    {qty > 0 && (
                      <input
                        value={noteById[s.id] ?? ''}
                        onChange={(e) => setNoteById((p) => ({ ...p, [s.id]: e.target.value }))}
                        placeholder="Catatan (opsional)"
                        className={`${INPUT} mt-2`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Total dihitung saat simpan oleh sistem.</p>
          </div>

          {/* Staff name-picker */}
          <Field label="Staff (opsional)">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={SELECT}>
              <option value="">— Tanpa staff —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama pelanggan"><input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Opsional" className={INPUT} /></Field>
            <Field label="WA pelanggan"><input type="tel" value={custWa} onChange={(e) => setCustWa(e.target.value.replace(/\D/g, ''))} placeholder="Opsional" className={INPUT} /></Field>
          </div>

          {/* Delivery + payment */}
          <Field label="Pengantaran">
            <ChipRow options={DELIVERY.map((d) => d.v)} labels={Object.fromEntries(DELIVERY.map((d) => [d.v, d.label]))} active={deliveryMode} onTap={(v) => setDeliveryMode(v as DeliveryMode)} />
          </Field>
          <Field label="Pembayaran">
            <ChipRow options={PAYMENT.map((p) => p.v)} labels={Object.fromEntries(PAYMENT.map((p) => [p.v, p.label]))} active={paymentStatus} onTap={(v) => setPaymentStatus(v as PaymentStatus)} />
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--color-balaundry)' }}
          >
            {submitting ? <><Spinner size={16} /> Menyimpan…</> : <><Icon name="point_of_sale" size={18} /> Buat Order</>}
          </button>
        </div>
      )}
    </Sheet>
  );
}

/* ─── Detail + status update ─────────────────────────────────── */

function OrderDetailPanel({ orderId, onClose, onUpdated }: { orderId: string; onClose: () => void; onUpdated: () => void }) {
  const api = useApi();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toStatus, setToStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateErr, setUpdateErr] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      setOrder(await api.get<Order>(`/balaundry/owner/orders/${orderId}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat detail.');
    } finally {
      setLoading(false);
    }
  }, [api, orderId]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus() {
    if (!toStatus || updating) return;
    setUpdating(true); setUpdateErr('');
    try {
      // 🔴 BE validateTransition (maju only). 400 = mundur/sama → tampilkan pesan.
      const updated = await api.patch<Order>(`/balaundry/owner/orders/${orderId}/status`, {
        to_status: toStatus,
        note: note.trim() || undefined,
      });
      setOrder(updated);
      setToStatus(''); setNote('');
      toast.success('Status diperbarui');
      onUpdated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) setUpdateErr('Status tidak valid (hanya maju).');
      else setUpdateErr(e instanceof ApiError ? e.message : 'Gagal memperbarui status.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Detail Order">
      {loading ? (
        <div className="py-10 flex justify-center"><Spinner /></div>
      ) : error ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          <button onClick={load} className="text-xs font-semibold underline" style={{ color: 'var(--color-balaundry)' }}>Coba lagi</button>
        </div>
      ) : order ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{order.display_id}</p>
              <p className="text-[11px] text-slate-400">{formatTanggalWIT(order.created_at, true)}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusToneClass(order.order_status)}`}>{statusLabel(order.order_status)}</span>
          </div>

          {/* Items snapshot — render apa adanya, NOL compute */}
          {order.items && order.items.length > 0 && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{it.name ?? it.service_id ?? 'Layanan'}</p>
                    {it.note && <p className="text-[11px] text-slate-400 truncate">{it.note}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500">×{it.qty}</span>
                    {it.subtotal != null && <span className="text-xs font-semibold text-slate-900">{formatRupiah(it.subtotal)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ringkasan — total dari BE */}
          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
            <Row label="Total" value={<span className="font-bold" style={{ color: 'var(--color-balaundry)' }}>{formatRupiah(order.total)}</span>} />
            {order.payment_status && <Row label="Pembayaran" value={order.payment_status === 'paid' ? 'Lunas' : 'Belum bayar'} />}
            {order.delivery_mode && <Row label="Pengantaran" value={order.delivery_mode === 'pickup_delivery' ? 'Jemput & antar' : 'Antar sendiri'} />}
            {order.customer_contact?.name && <Row label="Pelanggan" value={order.customer_contact.name} />}
            {order.customer_contact?.wa && <Row label="WA" value={order.customer_contact.wa} />}
          </div>

          {/* Update status — opsi dari ORDER_STATUS (links.ts), BE validate maju */}
          <div className="rounded-xl border border-slate-200 p-3 space-y-3">
            <p className="text-[13px] font-semibold text-slate-800">Ubah status</p>
            <select value={toStatus} onChange={(e) => setToStatus(e.target.value)} className={SELECT}>
              <option value="">— Pilih status tujuan —</option>
              {STATUS_KEYS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className={INPUT} />
            {updateErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{updateErr}</p>}
            <button
              onClick={updateStatus}
              disabled={!toStatus || updating}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'var(--color-balaundry)' }}
            >
              {updating ? <><Spinner size={16} /> Menyimpan…</> : 'Perbarui Status'}
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

/* ─── Primitives ─────────────────────────────────────────────── */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400"><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onDec} disabled={qty === 0} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-40">
        <Icon name="remove" size={16} />
      </button>
      <span className="w-6 text-center text-sm font-bold text-slate-900">{qty}</span>
      <button type="button" onClick={onInc} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--color-balaundry)' }}>
        <Icon name="add" size={16} />
      </button>
    </div>
  );
}

function ChipRow({ options, active, labels, onTap }: { options: string[]; active: string; labels?: Record<string, string>; onTap: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = active === o;
        return (
          <button key={o} type="button" onClick={() => onTap(o)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95 ${on ? 'text-white' : ''}`}
            style={on
              ? { background: 'var(--color-balaundry)', borderColor: 'var(--color-balaundry)' }
              : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[13px] font-semibold text-slate-800">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

function EmptyBox({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="py-16 text-center rounded-2xl bg-white border border-slate-200">
      <Icon name={icon} size={40} className="mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs mt-1 text-slate-500">{subtitle}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-200" />)}
    </div>
  );
}
