'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Analytics (B6 lanjutan)
// PATH: src/app/admin/bakos/analytics/page.tsx
// REAL: funnel SEED→CLAIM→BAYAR · tier basic/pro · sebaran kota/kab.
// 🛡️ Revenue 4303 = "coming soon" jujur (belum confirm money.*). Nol angka palsu.
// GET /bakos/admin/analytics
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Home, Hand, CreditCard, MapPin, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface Analytics {
  funnel: { total_kos: number; claimed: number; managed: number; claim_rate: number; convert_rate: number };
  tier: { basic: number; pro: number; total: number };
  sebaran: { kota: Array<{ name: string; type: string; jumlah_kos: number }>; total_aktif: number; kota_terisi: number };
  revenue: { total: number; count: number; period_days: number };
  generated_at: string;
}

export default function BakosAnalyticsTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const tk = () => token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') || '' : '');

  const fetchData = useCallback(async () => {
    if (!tk()) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${API_URL}/bakos/admin/analytics`, { headers: { Authorization: `Bearer ${tk()}` } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Gagal memuat analytics');
      setData(json.data);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rpFull = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (loading) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: t.textMuted, fontSize: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      Memuat analytics…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (err || !data) return (
    <div style={{ padding: '40px 32px', color: t.textDim }}>Gagal memuat: {err}</div>
  );

  const f = data.funnel;
  const maxFunnel = Math.max(f.total_kos, 1);
  const funnelSteps = [
    { icon: <Home size={16} />, label: 'Total Kos (seed)', value: f.total_kos, color: '#9CA3AF', note: 'inventory' },
    { icon: <Hand size={16} />, label: 'Diklaim owner', value: f.claimed, color: '#0891B2', note: `${f.claim_rate}% dari total` },
    { icon: <CreditCard size={16} />, label: 'Dikelola (bayar)', value: f.managed, color: '#10B981', note: `${f.convert_rate}% dari yang diklaim` },
  ];
  const maxKota = Math.max(...data.sebaran.kota.map(k => k.jumlah_kos), 1);
  const topKota = data.sebaran.kota.filter(k => k.jumlah_kos > 0).slice(0, 8);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, color: t.textPrimary }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Analytics</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>Funnel akuisisi · sebaran wilayah · {data.sebaran.total_aktif} kos aktif di {data.sebaran.kota_terisi} kota/kab</p>
      </div>

      {/* ── Funnel SEED → CLAIM → BAYAR ── */}
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>Funnel Akuisisi</h2>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 18 }}>Seed → Diklaim → Dikelola. Tiap tahap = tuas revenue.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funnelSteps.map((s, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                  <span style={{ color: s.color }}>{s.icon}</span>{s.label}
                </span>
                <span style={{ fontSize: 13, color: t.textDim }}><strong style={{ color: s.color, fontSize: 16 }}>{s.value}</strong> · {s.note}</span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: t.navHover, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max((s.value / maxFunnel) * 100, 2)}%`, height: '100%', background: s.color, borderRadius: 6, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* ── Tier breakdown ── */}
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>Paket Langganan</h2>
          <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 18 }}>{data.tier.total} kos berlangganan</p>
          {data.tier.total === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted, padding: '20px 0', textAlign: 'center' }}>Belum ada langganan aktif</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([['Basic', data.tier.basic, '#0891B2'], ['Pro', data.tier.pro, '#6366F1']] as const).map(([label, val, color]) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: t.textPrimary, fontWeight: 600 }}>{label}</span>
                    <span style={{ color }}>{val} kos</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: t.navHover, overflow: 'hidden' }}>
                    <div style={{ width: `${data.tier.total > 0 ? (val / data.tier.total) * 100 : 0}%`, height: '100%', background: color, borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Revenue 4303 REAL (dari financial_events) ── */}
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Revenue Langganan (4303)</h2>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: 20 }}>LIVE · pembukuan</span>
          </div>
          <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>{data.revenue.count} pembayaran · {data.revenue.period_days} hari terakhir</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10B981' }}>
            <TrendingUp size={26} />
            <span style={{ fontSize: 30, fontWeight: 800, color: t.textPrimary }}>{rpFull(data.revenue.total)}</span>
          </div>
          {data.revenue.count === 0 && (
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>Belum ada langganan terbayar di periode ini.</p>
          )}
        </div>
      </div>

      {/* ── Sebaran kota/kab ── */}
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} color="#F59E0B" /> Sebaran Kos Aktif per Kota/Kabupaten
        </h2>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 18 }}>Maluku Utara · hanya kos berstatus aktif</p>
        {topKota.length === 0 ? (
          <p style={{ fontSize: 13, color: t.textMuted, padding: '20px 0', textAlign: 'center' }}>Belum ada kos aktif dengan data wilayah</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topKota.map((k) => (
              <div key={k.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 160, fontSize: 13, color: t.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</span>
                <div style={{ flex: 1, height: 16, borderRadius: 5, background: t.navHover, overflow: 'hidden' }}>
                  <div style={{ width: `${(k.jumlah_kos / maxKota) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #0891B2, #1B6B4A)', borderRadius: 5, minWidth: 4 }} />
                </div>
                <span style={{ width: 36, textAlign: 'right', fontSize: 13, fontWeight: 700, color: t.textDim }}>{k.jumlah_kos}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
