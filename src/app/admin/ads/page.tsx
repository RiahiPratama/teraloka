'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { AdminTheme } from '@/components/admin/AdminThemeContext';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface AdPackage { id: string; name: string; slug: string; positions: string[]; duration_days: number; price: number; }
interface Ad {
  id: string; advertiser_name: string; advertiser_phone?: string;
  title: string; body?: string; image_url?: string; link_url: string;
  images?: Record<string, string>;
  positions: string[]; starts_at?: string; ends_at?: string;
  impression_count: number; click_count: number;
  billing_model: string; price_paid: number; status: string;
  payment_proof_url?: string; paid_at?: string;
  ad_packages?: { name: string; slug: string; price: number };
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Menunggu Bayar', color: '#D97706' },
  active:          { label: 'Aktif',          color: '#059669' },
  paused:          { label: 'Dijeda',          color: '#6B7280' },
  expired:         { label: 'Selesai',         color: '#DC2626' },
};
const POSITION_LABEL: Record<string, string> = {
  native:     'Native Feed',
  sidebar:    'Sidebar',
  banner:     'Banner Atas',
  homepage:   'Homepage',
  in_article: 'Dalam Artikel',
};
const POSITION_COLORS = ['#1B6B4A', '#0891B2', '#D97706', '#7C3AED', '#DC2626'];

// Spesifikasi ukuran ideal per posisi — ditampilkan di admin upload field
const POSITION_SPECS: Record<string, { aspect: string; recommended: string; icon: string }> = {
  native:     { aspect: '1:1 (square)',       recommended: '600 × 600',  icon: '🟩' },
  sidebar:    { aspect: '1.2:1 (portrait)',   recommended: '600 × 500',  icon: '📱' },
  banner:     { aspect: '8:1 (super wide)',   recommended: '1456 × 180', icon: '📏' },
  homepage:   { aspect: '1:1 (square)',       recommended: '600 × 600',  icon: '🏠' },
  in_article: { aspect: '16:9 (landscape)',   recommended: '800 × 450',  icon: '📝' },
};
const formatRp   = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatDate  = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatShort = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—';

// ── Placement Preview — terima t sebagai prop ──────────────────────
function PlacementPreview({ active, t }: { active: string[]; t: AdminTheme }) {
  const placements = [
    { key: 'native',     label: 'Native Feed\n(di BAKABAR)',    color: '#1B6B4A' },
    { key: 'sidebar',    label: 'Sidebar\n(di BAKABAR)',         color: '#0891B2' },
    { key: 'banner',     label: 'Banner Atas\n(di BAKABAR)',     color: '#D97706' },
    { key: 'homepage',   label: 'Homepage\n(TeraLoka)',          color: '#7C3AED' },
    { key: 'in_article', label: 'Dalam Artikel\n(di BAKABAR)',   color: '#DC2626' },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
        Contoh Penempatan Iklan
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {placements.map(p => {
          const isActive = active.includes(p.key);
          return (
            <div key={p.key} style={{ borderRadius: 8, border: `2px solid ${isActive ? p.color : t.cardBorder}`, background: isActive ? `${p.color}11` : t.deepBg, padding: '6px 4px', opacity: isActive ? 1 : 0.4, transition: 'all 0.2s' }}>
              <div style={{ height: 44, borderRadius: 4, background: t.cardInner, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {p.key === 'native' && (
                  <div style={{ width: '100%', padding: '4px 6px' }}>
                    <div style={{ height: 4, background: isActive ? p.color : t.inputBorder, borderRadius: 2, marginBottom: 3, width: '70%' }} />
                    <div style={{ height: 3, background: t.inputBorder, borderRadius: 2, width: '90%' }} />
                    <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 7, color: isActive ? p.color : t.textDim, fontWeight: 700 }}>Mitra</div>
                  </div>
                )}
                {p.key === 'sidebar' && (
                  <div style={{ padding: '4px 6px', width: '100%' }}>
                    <div style={{ height: 18, background: isActive ? `${p.color}33` : t.inputBorder, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? p.color : t.textDim }} />
                    </div>
                  </div>
                )}
                {p.key === 'banner' && (
                  <div style={{ width: '100%', height: 14, background: isActive ? `linear-gradient(to right, ${p.color}55, ${p.color}22)` : t.inputBorder, borderRadius: 3, margin: '0 4px' }} />
                )}
                {p.key === 'homepage' && (
                  <div style={{ width: '100%', height: '100%', background: isActive ? `linear-gradient(135deg, ${p.color}44, ${p.color}22)` : t.inputBorder, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12 }}>🏠</span>
                  </div>
                )}
                {p.key === 'in_article' && (
                  <div style={{ width: '100%', padding: '3px 4px' }}>
                    <div style={{ height: 2, background: t.inputBorder, borderRadius: 2, marginBottom: 2, width: '85%' }} />
                    <div style={{ height: 14, background: isActive ? `${p.color}33` : t.inputBorder, borderRadius: 3, marginBottom: 2 }} />
                    <div style={{ height: 2, background: t.inputBorder, borderRadius: 2, width: '90%' }} />
                  </div>
                )}
              </div>
              <p style={{ fontSize: 9, color: isActive ? p.color : t.textDim, fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{p.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function AdsAdminPage() {
  const { token }  = useAuth();
  const { t }      = useAdminTheme(); // ← consume theme context

  const [ads,        setAds]        = useState<Ad[]>([]);
  const [packages,   setPackages]   = useState<AdPackage[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [selected,   setSelected]   = useState<Ad | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [form, setForm] = useState({
    advertiser_name: '', advertiser_phone: '', package_id: '',
    title: '', body: '', link_url: '', price_paid: 0,
    images: {} as Record<string, string>,
  });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const h = { Authorization: `Bearer ${token}` };

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const url  = `${API}/admin/ads?limit=50${filter ? `&status=${filter}` : ''}`;
      const res  = await fetch(url, { headers: h });
      const json = await res.json();
      setAds(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch { showToast('Gagal memuat iklan', 'err'); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => {
    if (!token) return;
    fetchAds();
    fetch(`${API}/admin/ads/packages`, { headers: h })
      .then(r => r.json()).then(d => setPackages(d.data ?? [])).catch(() => {});
  }, [fetchAds, token]);

  const activeAds    = ads.filter(a => a.status === 'active');
  const totalImpress = ads.reduce((s, a) => s + (a.impression_count || 0), 0);
  const totalClicks  = ads.reduce((s, a) => s + (a.click_count || 0), 0);
  const avgCTR       = totalImpress > 0 ? ((totalClicks / totalImpress) * 100).toFixed(2) : '0.00';
  const totalRevenue = ads.filter(a => a.status !== 'pending_payment').reduce((s, a) => s + (a.price_paid || 0), 0);

  const clickByPos: Record<string, number> = {};
  ads.forEach(ad => {
    ad.positions.forEach(p => { clickByPos[p] = (clickByPos[p] || 0) + (ad.click_count || 0); });
  });
  const donutData = Object.entries(clickByPos).map(([name, value]) => ({
    name: POSITION_LABEL[name] || name, value,
  }));

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      date:   d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      tayang: Math.floor(Math.random() * 3000) + 4000,
      klik:   Math.floor(Math.random() * 200)  + 150,
    };
  });

  const selectedPkg = packages.find(p => p.id === form.package_id);

  const handleCreate = async () => {
    if (!form.advertiser_name || !form.package_id || !form.title || !form.link_url) {
      showToast('Lengkapi semua field wajib', 'err'); return;
    }

    // Validasi: semua posisi aktif paket wajib punya banner
    const positions = selectedPkg?.positions || [];
    const missingPositions = positions.filter(p => !form.images[p]);
    if (missingPositions.length > 0) {
      const labels = missingPositions.map(p => POSITION_LABEL[p] || p).join(', ');
      showToast(`Upload banner untuk posisi: ${labels}`, 'err'); return;
    }

    try {
      const res  = await fetch(`${API}/admin/ads`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Primary image_url (legacy) = native fallback; kalau native tidak ada pilih yang pertama
          image_url: form.images.native || Object.values(form.images)[0] || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Iklan berhasil dibuat');
      setShowForm(false);
      setForm({ advertiser_name: '', advertiser_phone: '', package_id: '', title: '', body: '', link_url: '', price_paid: 0, images: {} });
      fetchAds();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
  };

  const handleActivate = async (id: string) => {
    setProcessing(id);
    try {
      const res  = await fetch(`${API}/admin/ads/${id}/activate`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Iklan diaktifkan'); fetchAds();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan iklan ini?')) return;
    setProcessing(id);
    try {
      await fetch(`${API}/admin/ads/${id}`, { method: 'DELETE', headers: h });
      showToast('Iklan dinonaktifkan'); fetchAds();
    } catch { showToast('Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: t.textPrimary }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📢 Ads Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>Ringkasan performa iklan hari ini</p>
        </div>
        <button onClick={() => { setShowForm(true); setSelected(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          + Tambah Iklan
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Iklan Aktif', value: activeAds.length, sub: '+0 dari minggu lalu', color: t.codeText },
          { label: 'Total Tayang', value: totalImpress.toLocaleString('id-ID'), sub: 'Impresi total', color: '#38BDF8' },
          { label: 'Total Klik', value: totalClicks.toLocaleString('id-ID'), sub: 'Klik total', color: '#A78BFA' },
          { label: 'CTR Rata-rata', value: `${avgCTR}%`, sub: 'Click-through rate', color: '#FB923C' },
          { label: 'Pendapatan (Bulan Ini)', value: formatRp(totalRevenue), sub: 'Iklan aktif & selesai', color: t.codeText },
        ].map((k, i) => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: t.textMuted, fontWeight: 600 }}>{k.label}</p>
            <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: t.textDim }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Performa Iklan</p>
            <span style={{ fontSize: 11, color: t.textMuted }}>7 Hari Terakhir</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, color: t.textPrimary }} />
              <Line type="monotone" dataKey="tayang" stroke="#1B6B4A" strokeWidth={2} dot={false} name="Tayang" />
              <Line type="monotone" dataKey="klik"   stroke="#0891B2" strokeWidth={2} dot={false} name="Klik" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Klik Berdasarkan Penempatan</p>
          {donutData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textDim, fontSize: 13 }}>
              Belum ada data klik
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {donutData.map((_, i) => <Cell key={i} fill={POSITION_COLORS[i % POSITION_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, color: t.textPrimary }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm || selected ? '1fr 380px' : '1fr', gap: 16 }}>

        {/* Tabel iklan */}
        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>Iklan Terbaru</p>
            {['', 'active', 'pending_payment', 'expired'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${filter === s ? '#1B6B4A' : t.inputBorder}`, background: filter === s ? 'rgba(27,107,74,0.15)' : 'transparent', color: filter === s ? t.codeText : t.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {s === '' ? 'Semua' : STATUS_LABEL[s]?.label}
              </button>
            ))}
            <span style={{ fontSize: 11, color: t.textMuted }}>{total} iklan</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Memuat...</div>
          ) : ads.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📢</p>
              <p style={{ color: t.textMuted, fontWeight: 600 }}>Belum ada iklan</p>
              <button onClick={() => setShowForm(true)} style={{ marginTop: 12, padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                + Tambah Iklan Pertama
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    {['Iklan', 'Advertiser', 'Penempatan', 'Periode', 'Status', 'Tayang', 'Klik', 'CTR', 'Harga', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => {
                    const st  = STATUS_LABEL[ad.status] || { label: ad.status, color: '#9CA3AF' };
                    const ctr = ad.impression_count > 0 ? ((ad.click_count / ad.impression_count) * 100).toFixed(2) : '0.00';
                    const isSelected = selected?.id === ad.id;
                    return (
                      <tr key={ad.id} onClick={() => setSelected(isSelected ? null : ad)}
                        style={{ borderBottom: `1px solid ${t.cardBorder}`, cursor: 'pointer', background: isSelected ? 'rgba(27,107,74,0.08)' : 'transparent', transition: 'background 0.15s' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <p style={{ margin: 0, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</p>
                          {ad.ad_packages && <p style={{ margin: '2px 0 0', fontSize: 10, color: t.textMuted }}>{ad.ad_packages.name}</p>}
                        </td>
                        <td style={{ padding: '10px 14px', color: t.textMuted, whiteSpace: 'nowrap' }}>{ad.advertiser_name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ad.positions.map(p => (
                              <span key={p} style={{ fontSize: 9, fontWeight: 600, color: '#0891B2', background: 'rgba(8,145,178,0.1)', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                                {POSITION_LABEL[p] || p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: t.textMuted, whiteSpace: 'nowrap', fontSize: 11 }}>
                          {formatShort(ad.starts_at)} – {formatShort(ad.ends_at)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: `${st.color}22`, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: t.textPrimary, fontWeight: 600 }}>{(ad.impression_count || 0).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px 14px', color: t.textPrimary, fontWeight: 600 }}>{(ad.click_count || 0).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px 14px', color: t.codeText, fontWeight: 700 }}>{ctr}%</td>
                        <td style={{ padding: '10px 14px', color: t.codeText, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRp(ad.price_paid)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {ad.status === 'pending_payment' && (
                              <button onClick={e => { e.stopPropagation(); handleActivate(ad.id); }} disabled={processing === ad.id}
                                style={{ padding: '3px 10px', background: '#1B6B4A', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                ✓ Aktifkan
                              </button>
                            )}
                            {ad.status !== 'expired' && (
                              <button onClick={e => { e.stopPropagation(); handleDelete(ad.id); }} disabled={processing === ad.id}
                                style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 10, color: '#EF4444' }}>
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right panel */}
        {(showForm || selected) && (
          <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: '18px', height: 'fit-content', position: 'sticky', top: 80 }}>

            {showForm && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Tambah / Edit Iklan</p>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 10 }}>
                  {['Informasi Iklan', 'Penempatan', 'Periode & Harga'].map((label, i) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? t.codeText : t.textMuted, padding: '2px 6px' }}>{label}</span>
                  ))}
                </div>

                {[
                  { key: 'title',             label: 'Judul Iklan *',  placeholder: 'Promo Kopi Rempah Ternate' },
                  { key: 'link_url',          label: 'URL Tujuan *',   placeholder: 'https://...' },
                  { key: 'advertiser_name',   label: 'Advertiser *',   placeholder: 'Nama bisnis/toko' },
                  { key: 'advertiser_phone',  label: 'Nomor WA',       placeholder: '08123456789' },
                  { key: 'body',              label: 'Deskripsi',      placeholder: 'Nikmati kopi rempah pilihan...' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', padding: '7px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Tipe Iklan *</label>
                  <select value={form.package_id} onChange={e => {
                    const pkg = packages.find(p => p.id === e.target.value);
                    setForm(p => ({ ...p, package_id: e.target.value, price_paid: pkg?.price || 0 }));
                  }}
                    style={{ width: '100%', padding: '7px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">-- Pilih Paket --</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} — {formatRp(p.price)} / {p.duration_days} hari</option>)}
                  </select>
                </div>

                {/* Multi-Banner Upload — dynamic per posisi aktif paket */}
                {selectedPkg && selectedPkg.positions.length > 0 && (
                  <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                      📸 Upload Banner per Posisi
                    </p>
                    <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                      Paket <strong>{selectedPkg.name}</strong> tayang di {selectedPkg.positions.length} posisi.
                      Upload banner terpisah tiap posisi untuk quality maksimal.
                    </p>

                    {selectedPkg.positions.map(pos => {
                      const spec = POSITION_SPECS[pos];
                      return (
                        <div key={pos} style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px dashed ${t.cardBorder}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{spec?.icon || '📷'}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>
                              {POSITION_LABEL[pos] || pos}
                            </span>
                            {spec && (
                              <span style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>
                                · {spec.recommended} ({spec.aspect})
                              </span>
                            )}
                          </div>
                          <ImageUpload
                            bucket="ads"
                            label=""
                            existingUrls={form.images[pos] ? [form.images[pos]] : []}
                            onUpload={(urls: string[]) => setForm(p => ({
                              ...p,
                              images: { ...p.images, [pos]: urls[0] || '' },
                            }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <PlacementPreview active={selectedPkg?.positions || []} t={t} />

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={handleCreate}
                    style={{ flex: 1, padding: '9px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    Simpan
                  </button>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${t.inputBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: t.textMuted }}>
                    Batal
                  </button>
                </div>
              </>
            )}

            {!showForm && selected && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Detail Iklan</p>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {(() => { const st = STATUS_LABEL[selected.status] || { label: selected.status, color: '#9CA3AF' };
                    return <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}22`, padding: '3px 10px', borderRadius: 20 }}>● {st.label}</span>;
                  })()}
                  {selected.ad_packages && <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, alignSelf: 'center' }}>{selected.ad_packages.name}</span>}
                </div>

                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>{selected.title}</p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: t.textMuted }}>{selected.advertiser_name}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Total Tayang', value: (selected.impression_count || 0).toLocaleString('id-ID') },
                    { label: 'Total Klik',   value: (selected.click_count || 0).toLocaleString('id-ID') },
                    { label: 'CTR', value: `${selected.impression_count > 0 ? ((selected.click_count / selected.impression_count) * 100).toFixed(2) : '0.00'}%` },
                  ].map(s => (
                    <div key={s.label} style={{ background: t.deepBg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.codeText }}>{s.value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: t.textMuted }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {[
                  { label: 'Penempatan', value: selected.positions.map(p => POSITION_LABEL[p] || p).join(', ') },
                  { label: 'Periode',    value: `${formatDate(selected.starts_at)} – ${formatDate(selected.ends_at)}` },
                  { label: 'Harga',      value: formatRp(selected.price_paid) },
                  { label: 'Link',       value: selected.link_url },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.cardBorder}`, gap: 8 }}>
                    <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, flexShrink: 0 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: t.textPrimary, textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
                  </div>
                ))}

                {selected.status === 'pending_payment' && (
                  <button onClick={() => handleActivate(selected.id)} disabled={processing === selected.id}
                    style={{ width: '100%', marginTop: 14, padding: '9px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {processing === selected.id ? '...' : '✓ Konfirmasi Bayar & Aktifkan'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
