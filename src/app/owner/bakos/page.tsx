'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Dashboard (BACA)
// PATH: src/app/owner/bakos/page.tsx
// PENANDA: L5-FE-OWNER-DASHBOARD
// ────────────────────────────────────────────────────────────────
// Rumah kos owner (sejajar owner/funding utk BADONASI). Sumber data:
// GET /bakos/owner/overview. Paket + kuota + daftar kos dgn badge gerbang.
//
// 🛡️ Auth gate via useAuth; token disuntik otomatis oleh useApi.
// 🛡️ Tombol Tambah mengikuti quota.can_add_listing (penuh → ajakan upgrade).
// 🛡️ Anti-fabrikasi: hanya view_count/contact_count mentah, bukan statistik palsu.
// ⏳ Tombol Kelola/Tambah → route Batch FE-B (/owner/bakos/[id], /baru).
//    Tombol Upgrade → /owner/bakos/langganan (subscribe self-serve, batch nanti).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { Building2, Plus, Loader2, LogIn, AlertCircle, Crown, ChevronLeft } from 'lucide-react';
import OwnerKosCard from '@/components/bakos/owner/OwnerKosCard';
import { type OwnerOverview, BAKOS_TOKENS, formatRp } from '@/components/bakos/owner/types';

export default function OwnerBakosDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [data, setData] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<OwnerOverview>('/bakos/owner/overview');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data kos.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, load]);

  if (authLoading) return <FullScreen><Spinner /></FullScreen>;

  if (!user) {
    return (
      <FullScreen>
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: BAKOS_TOKENS.accentBg }}>
            <LogIn size={26} style={{ color: BAKOS_TOKENS.accent }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Masuk dulu untuk kelola kos</p>
          <p className="text-xs mt-1 mb-4" style={{ color: BAKOS_TOKENS.textSecondary }}>Daftarkan & kelola kos kamu dari sini.</p>
          <button onClick={() => router.push('/login?redirect=/owner/bakos')} className="text-xs font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform" style={{ background: BAKOS_TOKENS.accent, color: '#fff' }}>
            Masuk
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-[640px] mx-auto px-4 pt-5">
        {/* Back to hub */}
        <button onClick={() => router.push('/owner')} className="flex items-center gap-1 text-xs mb-3" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Portal Mitra
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: BAKOS_TOKENS.accentBg }}>
            <Building2 size={18} style={{ color: BAKOS_TOKENS.accent }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Kos Saya</h1>
            <p className="text-xs" style={{ color: BAKOS_TOKENS.textSecondary }}>Kelola listing kos kamu</p>
          </div>
        </div>

        {loading && <div className="py-20 flex justify-center"><Spinner /></div>}

        {!loading && error && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FDECEC', border: '0.5px solid #F7C1C1' }}>
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button onClick={load} className="text-xs font-semibold text-red-700 underline mt-1">Coba lagi</button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <SubscriptionCard data={data} onUpgrade={() => router.push('/owner/bakos/langganan')} />

            <div className="mt-3 mb-4">
              {data.quota.can_add_listing.ok ? (
                <button onClick={() => router.push('/owner/bakos/baru')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform" style={{ background: BAKOS_TOKENS.accent, color: '#fff' }}>
                  <Plus size={18} /> Tambah Kos
                </button>
              ) : (
                <button onClick={() => router.push('/owner/bakos/langganan')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border active:scale-[0.98] transition-transform" style={{ borderColor: BAKOS_TOKENS.accent, color: BAKOS_TOKENS.accent, background: BAKOS_TOKENS.accentBg }}>
                  <Crown size={16} /> Upgrade untuk tambah kos
                </button>
              )}
              {!data.quota.can_add_listing.ok && data.quota.can_add_listing.message && (
                <p className="text-[11px] text-center mt-1.5" style={{ color: BAKOS_TOKENS.textSecondary }}>{data.quota.can_add_listing.message}</p>
              )}
            </div>

            {data.listings.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 size={40} className="mx-auto mb-3" style={{ color: BAKOS_TOKENS.textTertiary }} />
                <p className="text-sm font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>Belum ada kos</p>
                <p className="text-xs mt-1" style={{ color: BAKOS_TOKENS.textSecondary }}>Tap "Tambah Kos" untuk mulai daftarin kos kamu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold" style={{ color: BAKOS_TOKENS.textSecondary }}>{data.listings.length} kos</p>
                {data.listings.map((kos) => (
                  <OwnerKosCard key={kos.id} kos={kos} onManage={(id) => router.push(`/owner/bakos/${id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SubscriptionCard({ data, onUpgrade }: { data: OwnerOverview; onUpgrade: () => void }) {
  const { subscription: sub, quota } = data;
  const isPaid = sub.price_monthly > 0;
  return (
    <div className="rounded-xl p-4" style={{ background: BAKOS_TOKENS.surface, border: `0.5px solid ${BAKOS_TOKENS.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>Paket kamu</p>
          <p className="text-lg font-bold leading-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>
            {sub.label}
            {isPaid && <span className="text-xs font-normal" style={{ color: BAKOS_TOKENS.textSecondary }}> · {formatRp(sub.price_monthly)}/bln</span>}
          </p>
        </div>
        {sub.tier !== 'bisnis' && (
          <button onClick={onUpgrade} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-transform shrink-0" style={{ background: BAKOS_TOKENS.accentBg, color: BAKOS_TOKENS.accent }}>
            <Crown size={13} /> Upgrade
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span style={{ color: BAKOS_TOKENS.textSecondary }}>Slot kos terpakai</span>
          <span className="font-semibold" style={{ color: BAKOS_TOKENS.textPrimary }}>{quota.listings_used} / {quota.listings_max}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (quota.listings_used / Math.max(1, quota.listings_max)) * 100)}%`, background: quota.listings_used >= quota.listings_max ? '#A32D2D' : BAKOS_TOKENS.accent }} />
        </div>
      </div>

      {sub.paid_until && (
        <p className="text-[10px] mt-2" style={{ color: BAKOS_TOKENS.textTertiary }}>
          Aktif sampai {new Date(sub.paid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}>{children}</div>;
}
function Spinner() {
  return <Loader2 size={24} className="animate-spin" style={{ color: BAKOS_TOKENS.accent }} />;
}
