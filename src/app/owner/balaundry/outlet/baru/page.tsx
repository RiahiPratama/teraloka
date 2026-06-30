'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Tambah outlet (Tahap B)
// PATH: src/app/owner/balaundry/outlet/baru/page.tsx
// ────────────────────────────────────────────────────────────────
// POST /balaundry/owner/businesses. location_id dari GeographicScopePicker
// (REUSE shared, BUKAN map baru). 403 QUOTA_EXCEEDED → modal upgrade.
// useApi (Bearer auto). Material Symbols. Royal blue var(--color-balaundry).
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import ImageUpload from '@/components/ui/ImageUpload';
import { GeographicScopePicker, type LocationScope, type LocationBreadcrumb } from '@/components/shared/locations';
import { Icon, Spinner, FullScreen, AuthGate } from '@/components/balaundry/owner/ui';
import { BALAUNDRY_BRAND } from '@/components/balaundry/owner/types';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-balaundry)] focus:ring-2 focus:ring-[var(--color-balaundry-muted)] placeholder:text-slate-400';

export default function OutletBaruPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [scope, setScope] = useState<LocationScope | null>(null);
  const [scopeLabel, setScopeLabel] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quotaModal, setQuotaModal] = useState(false);

  const canSubmit = name.trim().length >= 3 && !!scope;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true); setError('');
    try {
      const created = await api.post<{ id: string }>('/balaundry/owner/businesses', {
        name: name.trim(),
        location_id: scope?.id ?? null,
        address: address.trim() || undefined,
        whatsapp: whatsapp.replace(/\D/g, '') || undefined,
        photos: photos.length ? photos : undefined,
        cover_image_url: photos[0] ?? undefined,
      });
      toast.success('Outlet berhasil didaftarkan');
      router.push(`/owner/balaundry/outlet/${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'QUOTA_EXCEEDED' || e.status === 403)) {
        setQuotaModal(true);
      } else {
        setError(e instanceof ApiError ? e.message : 'Gagal mendaftarkan outlet. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;
  if (!user) return <AuthGate redirect="/owner/balaundry/outlet/baru" message="Masuk dulu untuk daftarkan outlet" />;

  return (
    <div className="min-h-screen pb-28 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button
          onClick={() => router.push('/owner/balaundry')}
          className="flex items-center gap-1 text-xs mb-3 text-slate-500 hover:opacity-70 transition-opacity"
        >
          <Icon name="chevron_left" size={16} /> Laundry Saya
        </button>

        <div className="mb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Daftarkan Outlet</h1>
          <p className="text-[13px] mt-0.5 text-slate-500">Isi info outlet laundry kamu</p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          <Field label="Nama Outlet">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Laundry Bersih Kota Baru" className={INPUT} />
          </Field>

          <Field label="Lokasi (Kelurahan/Desa)" hint="Untuk pencarian area & peta sebaran">
            <GeographicScopePicker
              value={scope}
              onChange={(s, bc?: LocationBreadcrumb) => { setScope(s); setScopeLabel(bc?.display_short ?? ''); }}
              allowedTypes={['kelurahan', 'desa']}
              allowGps
              brandColor={BALAUNDRY_BRAND}
              placeholder="Cari kelurahan / desa..."
            />
            {scopeLabel && (
              <p className="mt-1.5 text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--color-balaundry)' }}>
                <Icon name="location_on" size={14} /> {scopeLabel}
              </p>
            )}
          </Field>

          <Field label="Alamat Lengkap" hint="Opsional — nama jalan & nomor">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. ... No. ..." className={INPUT} />
          </Field>

          <Field label="Nomor WhatsApp" hint="Opsional">
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[var(--color-balaundry)] focus-within:ring-2 focus-within:ring-[var(--color-balaundry-muted)] transition">
              <span className="flex h-11 items-center border-r border-slate-200 px-3 text-sm text-slate-500">+62</span>
              <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} placeholder="812 3456 7890" className="flex-1 h-11 px-3 text-sm outline-none bg-transparent" />
            </div>
          </Field>

          <Field label="Foto Outlet" hint="Opsional — foto pertama jadi sampul">
            <ImageUpload bucket="listings" label="" onUpload={(urls: string[]) => setPhotos(urls)} existingUrls={photos} maxFiles={5} />
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            style={{ background: 'var(--color-balaundry)' }}
          >
            {submitting ? <><Spinner size={16} /> Mendaftarkan…</> : <><Icon name="add_business" size={18} /> Daftarkan Outlet</>}
          </button>
        </div>
      </div>

      {/* Modal QUOTA_EXCEEDED */}
      {quotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--color-balaundry-muted)' }}>
              <Icon name="workspace_premium" size={26} style={{ color: 'var(--color-balaundry)' }} />
            </div>
            <h2 className="text-base font-bold text-slate-900">Kuota outlet penuh</h2>
            <p className="mt-2 text-sm text-slate-500">Slot outlet untuk tier kamu sudah penuh. Upgrade langganan untuk menambah outlet.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setQuotaModal(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600">Nanti</button>
              <button
                onClick={() => router.push('/owner/balaundry/langganan')}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--color-balaundry)' }}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
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
