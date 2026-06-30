'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Kelola layanan (Tahap B)
// PATH: src/app/owner/balaundry/outlet/[bizId]/services/page.tsx
// ────────────────────────────────────────────────────────────────
// GET  /balaundry/owner/businesses/:bizId/services
// POST /balaundry/owner/businesses/:bizId/services
// PATCH /balaundry/owner/services/:serviceId  (edit + toggle is_active)
// useApi (Bearer auto). Material Symbols. Royal blue var(--color-balaundry).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/lib/balaundry-links';
import { Icon, Spinner, FullScreen, AuthGate } from '@/components/balaundry/owner/ui';
import type { OwnerService, ServiceType, ServiceUnit } from '@/components/balaundry/owner/types';

const TYPES: ServiceType[] = ['reguler', 'express', 'satuan', 'kiloan'];
const UNITS: ServiceUnit[] = ['kg', 'pcs'];
const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-balaundry)] focus:ring-2 focus:ring-[var(--color-balaundry-muted)] placeholder:text-slate-400';

interface FormState { id: string | null; name: string; type: ServiceType; unit: ServiceUnit; price: string; est_hours: string; }
const emptyForm: FormState = { id: null, name: '', type: 'reguler', unit: 'kg', price: '', est_hours: '' };
const fmtPrice = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function ServicesPage() {
  const { bizId } = useParams<{ bizId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const [list, setList] = useState<OwnerService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [form, setForm] = useState<FormState | null>(null); // null = form tertutup
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null); setForbidden(false);
      setList(await api.get<OwnerService[]>(`/balaundry/owner/businesses/${bizId}/services`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
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

  const canSubmit = !!form && form.name.trim().length >= 2 && form.price.replace(/\D/g, '').length > 0;

  async function handleSubmit() {
    if (!form || !canSubmit || submitting) return;
    setSubmitting(true); setFormError('');
    const payload = {
      name: form.name.trim(),
      type: form.type,
      unit: form.unit,
      price: Number(form.price.replace(/\D/g, '')),
      est_hours: form.est_hours.trim() ? Number(form.est_hours) : undefined,
    };
    try {
      if (form.id) {
        await api.patch<OwnerService>(`/balaundry/owner/services/${form.id}`, payload);
        toast.success('Layanan diperbarui');
      } else {
        await api.post<OwnerService>(`/balaundry/owner/businesses/${bizId}/services`, payload);
        toast.success('Layanan ditambahkan');
      }
      setForm(null);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Gagal menyimpan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(svc: OwnerService) {
    if (togglingId) return;
    setTogglingId(svc.id);
    // Optimistic — revert kalau gagal.
    setList((prev) => prev?.map((s) => s.id === svc.id ? { ...s, is_active: !s.is_active } : s) ?? prev);
    try {
      await api.patch<OwnerService>(`/balaundry/owner/services/${svc.id}`, { is_active: !svc.is_active });
    } catch (e) {
      setList((prev) => prev?.map((s) => s.id === svc.id ? { ...s, is_active: svc.is_active } : s) ?? prev);
      toast.error(e instanceof ApiError ? e.message : 'Gagal mengubah status.');
    } finally {
      setTogglingId(null);
    }
  }

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;
  if (!user) return <AuthGate redirect={`/owner/balaundry/outlet/${bizId}/services`} message="Masuk dulu untuk kelola layanan" />;

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button
          onClick={() => router.push(`/owner/balaundry/outlet/${bizId}`)}
          className="flex items-center gap-1 text-xs mb-3 text-slate-500 hover:opacity-70 transition-opacity"
        >
          <Icon name="chevron_left" size={16} /> Detail outlet
        </button>

        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Kelola Layanan</h1>
          {!forbidden && (
            <button
              onClick={() => { setForm({ ...emptyForm }); setFormError(''); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white active:scale-95 transition-transform"
              style={{ background: 'var(--color-balaundry)' }}
            >
              <Icon name="add" size={16} /> Tambah
            </button>
          )}
        </div>

        {loading && <ListSkeleton />}

        {!loading && forbidden && (
          <EmptyBox icon="lock" title="Bukan outlet Anda" subtitle="Outlet ini bukan milik akun kamu." />
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

        {!loading && !forbidden && !error && list && (
          list.length === 0 ? (
            <EmptyBox icon="dry_cleaning" title="Belum ada layanan" subtitle='Tap "Tambah" untuk membuat layanan pertama.' />
          ) : (
            <div className="space-y-3">
              {list.map((svc) => (
                <div key={svc.id} className="rounded-2xl p-4 bg-white border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{svc.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--color-balaundry-muted)', color: 'var(--color-balaundry)' }}>{svc.type}</span>
                        <span className="text-[11px] text-slate-400">per {svc.unit}</span>
                        {svc.est_hours != null && <span className="text-[11px] text-slate-400">· ~{svc.est_hours} jam</span>}
                      </div>
                    </div>
                    <p className="text-sm font-bold shrink-0 text-slate-900">{formatRupiah(svc.price)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => { setForm({ id: svc.id, name: svc.name, type: svc.type as ServiceType, unit: svc.unit as ServiceUnit, price: fmtPrice(String(svc.price)), est_hours: svc.est_hours != null ? String(svc.est_hours) : '' }); setFormError(''); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-balaundry)' }}>
                      <Icon name="edit" size={14} /> Edit
                    </button>
                    <button onClick={() => toggleActive(svc)} disabled={togglingId === svc.id} className="inline-flex items-center gap-2 disabled:opacity-50">
                      <span className="text-[11px] font-medium text-slate-500">{svc.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      <span className="relative inline-block w-9 h-5 rounded-full transition-colors" style={{ background: svc.is_active ? 'var(--color-balaundry)' : 'var(--color-border)' }}>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: svc.is_active ? 'translateX(16px)' : 'none' }} />
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Form modal (tambah / edit) */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !submitting && setForm(null)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">{form.id ? 'Edit Layanan' : 'Tambah Layanan'}</h2>
              <button onClick={() => !submitting && setForm(null)} className="text-slate-400"><Icon name="close" size={20} /></button>
            </div>

            <Field label="Nama Layanan">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cuci kering lipat" className={INPUT} />
            </Field>

            <Field label="Jenis">
              <ChipRow options={TYPES} active={form.type} onTap={(v) => setForm({ ...form, type: v as ServiceType })} />
            </Field>

            <Field label="Satuan">
              <ChipRow options={UNITS} active={form.unit} onTap={(v) => setForm({ ...form, unit: v as ServiceUnit })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga (Rp)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: fmtPrice(e.target.value) })} placeholder="10.000" className={`${INPUT} pl-9`} />
                </div>
              </Field>
              <Field label="Estimasi (jam)" hint="Opsional">
                <input type="number" min="0" value={form.est_hours} onChange={(e) => setForm({ ...form, est_hours: e.target.value })} placeholder="24" className={INPUT} />
              </Field>
            </div>

            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'var(--color-balaundry)' }}
            >
              {submitting ? <><Spinner size={16} /> Menyimpan…</> : (form.id ? 'Simpan Perubahan' : 'Tambah Layanan')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipRow({ options, active, onTap }: { options: string[]; active: string; onTap: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = active === o;
        return (
          <button key={o} type="button" onClick={() => onTap(o)}
            className="rounded-full px-3 py-1.5 text-xs font-medium border capitalize transition active:scale-95"
            style={on
              ? { background: 'var(--color-balaundry)', color: '#fff', borderColor: 'var(--color-balaundry)' }
              : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[13px] font-semibold text-slate-800">{label}</label>
      {hint && <p className="text-[11px] mb-1.5 text-slate-400">{hint}</p>}
      <div className={hint ? '' : 'mt-1.5'}>{children}</div>
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
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
    </div>
  );
}
