'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Langganan / Upgrade (etalase paket)
// PATH: src/app/owner/bakos/langganan/page.tsx
// PENANDA: L5-FE-OWNER-LANGGANAN
// ────────────────────────────────────────────────────────────────
// Manual-first (nol backend baru): etalase 4 tier (angka MIRROR tier-config),
// highlight paket aktif, tombol "Pilih" → WA admin (template otomatis).
// Admin lalu confirm manual via /bakos/admin/.../subscription/confirm.
// 🛡️ Tidak menampilkan rekening di publik (admin kasih via WA per-orang).
// 🛡️ Tidak ada status "pending" palsu — backend antrian belum ada.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useApi, ApiError } from '@/lib/api/client';
import { BAKOS_TOKENS, formatRp } from '@/components/bakos/owner/types';
import { ChevronLeft, Check, Loader2, Crown, MessageCircle, Lock, Unlock } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;
const WA_ADMIN = '6281330006511'; // 0813-3000-6511 (format internasional, tanpa +/spasi)

type Tier = 'free' | 'basic' | 'pro' | 'bisnis';

// MIRROR tier-config.ts (backend = sumber kebenaran). Sinkronkan bila tarif berubah.
const TIERS: {
  tier: Tier; label: string; tagline: string; price: number;
  listings: string; rooms: string; photos: number; contact: boolean;
  features: string[];
}[] = [
  { tier: 'free', label: 'Free', tagline: 'Daftar & lengkapi data kos kamu — gratis.', price: 0,
    listings: '1 kos', rooms: '≤ 5 kamar', photos: 3, contact: false,
    features: ['Tampil di pencarian (area kelurahan)'] },
  { tier: 'basic', label: 'Basic', tagline: 'Buka kontak — calon penyewa bisa langsung WA kamu.', price: 49_000,
    listings: '1 kos', rooms: '≤ 20 kamar', photos: 8, contact: true,
    features: ['Kontak WA terbuka', 'Alamat lengkap tampil'] },
  { tier: 'pro', label: 'Pro', tagline: 'Sampai 3 kos + pengingat WA + tampil lebih atas.', price: 99_000,
    listings: '3 kos', rooms: 'Kamar tanpa batas', photos: 15, contact: true,
    features: ['Kontak WA terbuka', 'Pengingat WA otomatis', 'Tampil lebih atas di pencarian'] },
  { tier: 'bisnis', label: 'Bisnis', tagline: 'Sampai 6 kos + analytics + badge bisnis.', price: 149_000,
    listings: '6 kos', rooms: 'Kamar tanpa batas', photos: 30, contact: true,
    features: ['Semua fitur Pro', 'Analytics mendalam', 'Badge "Bisnis"', 'Posisi teratas'] },
];

export default function OwnerLanggananPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi();
  const router = useRouter();

  const [currentTier, setCurrentTier] = useState<Tier>('free');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const ov = await api.get<any>('/bakos/owner/overview');
      setCurrentTier((ov?.subscription?.tier as Tier) ?? 'free');
    } catch {
      setCurrentTier('free');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
  }, [authLoading, user, load]);

  function pilih(t: Tier, label: string) {
    const nama = user?.name ?? '+' + (user?.phone ?? '');
    const msg = `Halo Admin TeraLoka 👋\nSaya *${nama}*, owner kos di BAKOS.\nMau upgrade ke paket *${label}* (${formatRp(TIERS.find(x => x.tier === t)!.price)}/bln).\nMohon info cara pembayaran & rekening tujuannya. Terima kasih!`;
    window.open(`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><Loader2 className="animate-spin" style={{ color: BRAND }} /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: BAKOS_TOKENS.pageBg }}><button onClick={() => router.push('/login?redirect=/owner/bakos/langganan')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>Masuk dulu</button></div>;

  const order: Tier[] = ['free', 'basic', 'pro', 'bisnis'];
  const currentIdx = order.indexOf(currentTier);

  return (
    <div className="min-h-screen pb-16" style={{ background: BAKOS_TOKENS.pageBg }}>
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => router.push('/owner/bakos')} className="flex items-center gap-1 text-xs mb-3 hover:opacity-70 transition-opacity" style={{ color: BAKOS_TOKENS.textSecondary }}>
          <ChevronLeft size={14} /> Kos Saya
        </button>

        <div className="mb-5">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: BAKOS_TOKENS.textPrimary }}>Paket Langganan</h1>
          <p className="text-[13px] mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>Upgrade buka kontak & tambah kapasitas kos kamu.</p>
        </div>

        <div className="space-y-3">
          {TIERS.map((t, idx) => {
            const isCurrent = t.tier === currentTier;
            const isDowngrade = idx < currentIdx;
            const highlight = t.tier === 'pro'; // paket rekomendasi
            return (
              <div key={t.tier} className="rounded-2xl bg-white p-5 relative overflow-hidden"
                style={{ border: `1px solid ${isCurrent ? BRAND : BAKOS_TOKENS.border}`, boxShadow: isCurrent ? `0 0 0 1px ${BRAND}` : '0 1px 2px rgba(0,0,0,0.03)' }}>
                {highlight && !isCurrent && (
                  <span className="absolute top-0 right-0 text-[10px] font-bold text-white px-2.5 py-1 rounded-bl-xl" style={{ background: BRAND }}>POPULER</span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>{t.label}</h2>
                      {isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: BAKOS_TOKENS.accentBg, color: BRAND }}>PAKET KAMU</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: BAKOS_TOKENS.textSecondary }}>{t.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold leading-none" style={{ color: BAKOS_TOKENS.textPrimary }}>{t.price === 0 ? 'Gratis' : formatRp(t.price)}</p>
                    {t.price > 0 && <p className="text-[10px]" style={{ color: BAKOS_TOKENS.textTertiary }}>per bulan</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 mb-3">
                  <Tag>{t.listings}</Tag>
                  <Tag>{t.rooms}</Tag>
                  <Tag>{t.photos} foto/kos</Tag>
                  <Tag tone={t.contact ? 'good' : 'muted'}>
                    {t.contact ? <Unlock size={11} /> : <Lock size={11} />} {t.contact ? 'Kontak terbuka' : 'Kontak terkunci'}
                  </Tag>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: BAKOS_TOKENS.textSecondary }}>
                      <Check size={14} style={{ color: BRAND }} className="shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled className="w-full rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textTertiary }}>Paket aktif</button>
                ) : t.tier === 'free' || isDowngrade ? (
                  <button disabled className="w-full rounded-xl py-2.5 text-sm font-medium border opacity-50" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textTertiary }}>
                    {t.tier === 'free' ? 'Paket dasar' : 'Tier lebih rendah'}
                  </button>
                ) : (
                  <button onClick={() => pilih(t.tier, t.label)} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-[0.99] transition-transform" style={{ background: BRAND }}>
                    {currentIdx >= 1 ? <Crown size={15} /> : <MessageCircle size={15} />} Pilih {t.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl p-4" style={{ background: BAKOS_TOKENS.accentBg, border: `1px solid ${BAKOS_TOKENS.border}` }}>
          <p className="text-xs font-semibold mb-1" style={{ color: BRAND }}>Cara berlangganan</p>
          <p className="text-[11px] leading-relaxed" style={{ color: BAKOS_TOKENS.textSecondary }}>
            Tap "Pilih" → kamu diarahkan ke WhatsApp admin. Admin kirim instruksi transfer & rekening. Setelah transfer terkonfirmasi, paket kamu langsung aktif & kontak kos terbuka.
          </p>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'good' | 'muted' }) {
  const style = tone === 'good'
    ? { background: '#EAF5EE', color: '#15803D' }
    : tone === 'muted'
      ? { background: '#F3F1EA', color: BAKOS_TOKENS.textTertiary }
      : { background: BAKOS_TOKENS.accentBg, color: BRAND };
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full" style={style}>{children}</span>;
}
