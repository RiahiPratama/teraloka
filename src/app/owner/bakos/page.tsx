'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Dashboard (PREMIUM)
// PATH: src/app/owner/bakos/page.tsx
// PENANDA: L5-FE-OWNER-DASHBOARD
// ────────────────────────────────────────────────────────────────
// GET /bakos/owner/overview → paket + kuota + daftar kos (gate badge).
// Visual selaras flow (kartu putih, amber, kertas bg).
// 🛡️ Anti-fabrikasi: hanya view_count/contact_count mentah.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { Building2, Plus, Loader2, LogIn, AlertCircle, Crown, ChevronLeft } from 'lucide-react';
import OwnerKosCard from '@/components/bakos/owner/OwnerKosCard';
import { OwnerPaketCTA, OwnerFeatureTeasers } from '@/components/bakos/owner/OwnerTierSections';
import { type OwnerOverview, BAKOS_TOKENS, formatRp } from '@/components/bakos/owner/types';

const BRAND = BAKOS_TOKENS.accent;

export default function OwnerBakosDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [data, setData] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await api.get<OwnerOverview>('/bakos/owner/overview'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data kos.');
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

  if (!user) {
    return (
      <FullScreen>
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: BAKOS_TOKENS.accentBg }}>
            <LogIn size={26} style={{ color: BRAND }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Masuk dulu untuk kelola kos</p>
          <p className="text-xs mt-1 mb-4" style={{ color: BAKOS_TOKENS.textSecondary }}>Daftarkan & kelola kos kamu dari sini.</p>
          <button onClick={() => router.push('/login?redirect=/owner/bakos')} className="text-xs font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform" style={{ background: BRAND, color: '#fff' }}>Masuk</button>
        </div>
      </FullScreen>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push('/owner')} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Portal Mitra
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: BAKOS_TOKENS.accentBg, border: `1px solid ${BAKOS_TOKENS.border}` }}>
            <Building2 size={19} style={{ color: BRAND }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Kos Saya</h1>
            <p className="text-[13px]" style={{ color: BAKOS_TOKENS.textSecondary }}>Kelola listing kos kamu</p>
          </div>
        </div>

        {loading && <div className="py-20 flex justify-center"><Spinner /></div>}

        {!loading && error && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#FDECEC', border: '1px solid #F7C1C1' }}>
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* 1. Paket kamu */}
            <SubscriptionCard data={data} onUpgrade={() => router.push('/owner/bakos/langganan')} />

            {/* 2. CTA "Lihat semua paket" — naik ke atas, dekat Paket Kamu (sembunyi di Bisnis) */}
            <div className="mt-4">
              <OwnerPaketCTA data={data} onUpgrade={() => router.push('/owner/bakos/langganan')} />
            </div>

            {/* 3. Tombol Tambah Kos */}
            <div className="mt-4 mb-5">
              {data.quota.can_add_listing.ok ? (
                <button onClick={() => router.push('/owner/bakos/baru')} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold active:scale-[0.99] transition-transform shadow-sm" style={{ background: BRAND, color: '#fff' }}>
                  <Plus size={18} /> Tambah Kos
                </button>
              ) : data.subscription.tier === 'bisnis' ? (
                // Bisnis = paket tertinggi (ceiling). Tidak ada upgrade — tampil pesan netral.
                <div className="w-full text-center py-3.5 rounded-2xl text-sm font-semibold" style={{ background: BAKOS_TOKENS.surfaceAlt, color: BAKOS_TOKENS.textSecondary }}>
                  Kuota kos paket Bisnis sudah penuh
                </div>
              ) : (
                <button onClick={() => router.push('/owner/bakos/langganan')} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold border active:scale-[0.99] transition-transform" style={{ borderColor: BRAND, color: BRAND, background: BAKOS_TOKENS.accentBg }}>
                  <Crown size={16} /> Upgrade untuk tambah kos
                </button>
              )}
              {!data.quota.can_add_listing.ok && data.subscription.tier !== 'bisnis' && data.quota.can_add_listing.message && (
                <p className="text-[11px] text-center mt-2" style={{ color: BAKOS_TOKENS.textSecondary }}>{data.quota.can_add_listing.message}</p>
              )}
            </div>

            {/* 4. Daftar kos / empty state */}
            {data.listings.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-white" style={{ border: `1px solid ${BAKOS_TOKENS.border}` }}>
                <Building2 size={40} className="mx-auto mb-3" style={{ color: BAKOS_TOKENS.textTertiary }} />
                <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Belum ada kos</p>
                <p className="text-xs mt-1" style={{ color: BAKOS_TOKENS.textSecondary }}>Tap "Tambah Kos" untuk mulai daftarin kos kamu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: BAKOS_TOKENS.textTertiary }}>{data.listings.length} kos</p>
                {data.listings.map((kos) => (
                  <OwnerKosCard key={kos.id} kos={kos} onManage={(id) => router.push(`/owner/bakos/${id}`)} />
                ))}
              </div>
            )}

            {/* 5. Teaser fitur premium (Performa + Pengingat) — paling bawah */}
            <OwnerFeatureTeasers data={data} onUpgrade={() => router.push('/owner/bakos/langganan')} />
          </>
        )}
      </div>
    </div>
  );
}

function SubscriptionCard({ data, onUpgrade }: { data: OwnerOverview; onUpgrade: () => void }) {
  const { subscription: sub, quota } = data;
  const isPaid = sub.price_monthly > 0;
  const pct = Math.min(100, (quota.listings_used / Math.max(1, quota.listings_max)) * 100);
  const full = quota.listings_used >= quota.listings_max;
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: BAKOS_TOKENS.textTertiary }}>Paket kamu</p>
          <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: BAKOS_TOKENS.textPrimary }}>
            {sub.label}
            {isPaid && <span className="text-sm font-normal" style={{ color: BAKOS_TOKENS.textSecondary }}> · {formatRp(sub.price_monthly)}/bln</span>}
          </p>
        </div>
        {sub.tier !== 'bisnis' && (
          <button onClick={onUpgrade} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-transform shrink-0" style={{ background: BAKOS_TOKENS.accentBg, color: BRAND }}>
            <Crown size={13} /> Upgrade
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span style={{ color: BAKOS_TOKENS.textSecondary }}>Slot kos terpakai</span>
          <span className="font-bold" style={{ color: full ? '#A32D2D' : BAKOS_TOKENS.textPrimary }}>{quota.listings_used} / {quota.listings_max}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDEAE1' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: full ? '#A32D2D' : BRAND }} />
        </div>
      </div>

      {sub.paid_until && (
        <p className="text-[11px] mt-3" style={{ color: BAKOS_TOKENS.textTertiary }}>
          Aktif sampai {new Date(sub.paid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}>{children}</div>;
}
function Spinner() { return <Loader2 size={24} className="animate-spin" style={{ color: BRAND }} />; }
