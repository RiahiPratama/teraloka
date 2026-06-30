'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Langganan (Tahap D)
// PATH: src/app/owner/balaundry/langganan/page.tsx
// ────────────────────────────────────────────────────────────────
// GET  /balaundry/owner/subscription          → EffectiveSubscription
// GET  /balaundry/owner/subscription/tiers     → tiers + can_upgrade_to
// POST /balaundry/owner/subscription/upgrade-request {target_tier}
//      → {target_tier, amount, payment_instructions}
// 🔴 BE single source: harga/maxOutlets/fitur dari /tiers — NOL tabel hardcode FE.
// 🛡️ MANUAL-FIRST: upgrade TIDAK instan. Transfer + kirim bukti → admin konfirmasi.
// useApi (Bearer auto). Material Symbols. Royal blue var(--color-balaundry).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { formatRupiah } from '@/lib/balaundry-links';
import { Icon, Spinner, FullScreen, AuthGate, formatTanggalWIT } from '@/components/balaundry/owner/ui';
import type { EffectiveSubscription, SubscriptionTiers, TierSpec, UpgradeRequestResult } from '@/components/balaundry/owner/types';

const FEATURE_LABEL: { key: 'waReminder' | 'priorityListing' | 'analytics'; label: string }[] = [
  { key: 'waReminder', label: 'Pengingat WhatsApp' },
  { key: 'priorityListing', label: 'Listing prioritas' },
  { key: 'analytics', label: 'Analitik' },
];

export default function LanggananPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [sub, setSub] = useState<EffectiveSubscription | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTiers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [upgrading, setUpgrading] = useState<string | null>(null); // tier yg lagi diproses
  const [result, setResult] = useState<UpgradeRequestResult | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [s, t] = await Promise.all([
        api.get<EffectiveSubscription>('/balaundry/owner/subscription'),
        api.get<SubscriptionTiers>('/balaundry/owner/subscription/tiers'),
      ]);
      setSub(s);
      setTiers(t);
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

  async function requestUpgrade(tier: TierSpec) {
    if (upgrading) return;
    setUpgrading(tier.tier);
    try {
      const r = await api.post<UpgradeRequestResult>('/balaundry/owner/subscription/upgrade-request', { target_tier: tier.tier });
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim permintaan upgrade.');
    } finally {
      setUpgrading(null);
    }
  }

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;
  if (!user) return <AuthGate redirect="/owner/balaundry/langganan" message="Masuk dulu untuk kelola langganan" />;

  const effectiveTier = tiers?.effective_tier ?? sub?.effective_tier ?? '';
  const currentSpec = tiers?.tiers.find((t) => t.tier === effectiveTier);

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button
          onClick={() => router.push('/owner/balaundry')}
          className="flex items-center gap-1 text-xs mb-3 text-slate-500 hover:opacity-70 transition-opacity"
        >
          <Icon name="chevron_left" size={16} /> Laundry Saya
        </button>

        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 mb-5">Langganan</h1>

        {loading && <Skeleton />}

        {!loading && error && (
          <div className="rounded-2xl p-4 flex items-start gap-3 bg-red-50 border border-red-200">
            <Icon name="error" size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !error && sub && tiers && (
          <div className="space-y-5">
            {/* Kartu tier sekarang */}
            <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Paket aktif</p>
                  <p className="text-xl font-bold leading-tight mt-0.5 text-slate-900">{currentSpec?.label ?? effectiveTier}</p>
                  {currentSpec?.tagline && <p className="text-[12px] text-slate-500 mt-0.5">{currentSpec.tagline}</p>}
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${sub.is_expired ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Icon name={sub.is_expired ? 'cancel' : 'check_circle'} size={13} /> {sub.is_expired ? 'Expired' : 'Aktif'}
                </span>
              </div>
              {sub.paid_until && (
                <p className="text-[11px] mt-3 text-slate-400">Aktif sampai {formatTanggalWIT(sub.paid_until)}</p>
              )}
            </div>

            {/* Daftar tier — semua dari /tiers BE */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest px-1 text-slate-400">Pilihan paket</p>
              {tiers.tiers.map((t) => {
                const isCurrent = t.tier === effectiveTier;
                const canUpgrade = tiers.can_upgrade_to.includes(t.tier);
                return (
                  <div key={t.tier} className="rounded-2xl p-5 bg-white border" style={{ borderColor: isCurrent ? 'var(--color-balaundry)' : 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-slate-900">{t.label}</p>
                          {isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-balaundry-muted)', color: 'var(--color-balaundry)' }}>Saat ini</span>}
                        </div>
                        {t.tagline && <p className="text-[12px] text-slate-500 mt-0.5">{t.tagline}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-900">{t.priceMonthly > 0 ? formatRupiah(t.priceMonthly) : 'Gratis'}</p>
                        {t.priceMonthly > 0 && <p className="text-[10px] text-slate-400">/bulan</p>}
                      </div>
                    </div>

                    {/* maxOutlets + fitur — dari BE */}
                    <div className="mt-3 space-y-1.5">
                      <FeatureRow on label={`${t.maxOutlets} outlet`} />
                      {FEATURE_LABEL.map((f) => (
                        <FeatureRow key={f.key} on={t.features?.[f.key]} label={f.label} />
                      ))}
                    </div>

                    {/* Tombol upgrade HANYA untuk can_upgrade_to */}
                    {canUpgrade ? (
                      <button
                        onClick={() => requestUpgrade(t)}
                        disabled={upgrading === t.tier}
                        className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                        style={{ background: 'var(--color-balaundry)' }}
                      >
                        {upgrading === t.tier ? <><Spinner size={16} /> Memproses…</> : <><Icon name="upgrade" size={18} /> Upgrade ke {t.label}</>}
                      </button>
                    ) : !isCurrent ? (
                      <div className="mt-4 w-full rounded-xl py-2.5 text-center text-xs font-medium bg-slate-50 text-slate-400">Tidak tersedia</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal payment instructions — MANUAL FIRST */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setResult(null)}>
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Instruksi Pembayaran</h2>
              <button onClick={() => setResult(null)} className="text-slate-400"><Icon name="close" size={20} /></button>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--color-balaundry-muted)' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--color-balaundry)' }}>Total transfer</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-balaundry)' }}>{formatRupiah(result.amount)}</p>
            </div>

            <PaymentInstructions data={result.payment_instructions} />

            {/* 🛡️ Manual-first — tier TIDAK langsung berubah */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <Icon name="info" size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                Transfer sesuai nominal di atas, lalu <strong>kirim bukti ke admin</strong>. Paket <strong>aktif setelah dikonfirmasi admin</strong> — tier belum berubah saat ini.
              </p>
            </div>

            <button onClick={() => setResult(null)} className="w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: 'var(--color-balaundry)' }}>Mengerti</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Render payment_instructions defensif (string | objek) ──────── */

function PaymentInstructions({ data }: { data: unknown }) {
  if (data == null) return null;
  if (typeof data === 'string') {
    return <p className="text-sm text-slate-700 whitespace-pre-line">{data}</p>;
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => v != null && typeof v !== 'object');
    return (
      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-[11px] text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
            <span className="text-xs font-semibold text-slate-800 text-right">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-slate-700">{String(data)}</p>;
}

function FeatureRow({ on, label }: { on?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={on ? 'check_circle' : 'remove'} size={15} className={on ? 'text-emerald-600' : 'text-slate-300'} />
      <span className={`text-xs ${on ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
    </div>
  );
}
