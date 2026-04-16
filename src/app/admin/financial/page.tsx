'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const formatRp  = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatShort = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

const SOURCE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  ads:          { label: 'Ads (Iklan)',       icon: '📢', color: '#1B6B4A' },
  mitra:        { label: 'Bakos (Klasified)', icon: '🏠', color: '#0891B2' },
  commission:   { label: 'Komisi BAPASIAR',   icon: '🚢', color: '#7C3AED' },
  platform_fee: { label: 'Basumbang (Donasi)',icon: '❤️', color: '#E8963A' },
};

const FUNNEL_DATA = [
  { label: 'Visitor', desc: 'Total pengunjung',             color: '#1B6B4A', pct: 100  },
  { label: 'View Konten', desc: 'Melihat artikel / listing', color: '#0891B2', pct: 41.5 },
  { label: 'Klik / Interaksi', desc: 'Klik CTA / hubungi',  color: '#7C3AED', pct: 11.0 },
  { label: 'Inquiry / Chat', desc: 'Memulai chat / kontak',  color: '#D97706', pct: 2.8  },
  { label: 'Transaksi', desc: 'Berhasil transaksi',          color: '#059669', pct: 0.13 },
];

export default function AdminFinancialPage() {
  const { token } = useAuth();
  const [stats,    setStats]    = useState<any>(null);
  const [records,  setRecords]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [form, setForm]         = useState({ type: 'ads', amount: '', description: '' });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/admin/ads/revenue/stats`, { headers: h }).then(r => r.json()),
      fetch(`${API}/admin/ads/revenue?limit=20`, { headers: h }).then(r => r.json()),
    ]).then(([s, r]) => {
      if (s.success) setStats(s.data);
      if (r.success) setRecords(r.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleAddRevenue = async () => {
    if (!form.amount || !form.description) { showToast('Lengkapi semua field', 'err'); return; }
    try {
      const res  = await fetch(`${API}/admin/ads/revenue`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Revenue tercatat');
      setShowForm(false);
      setForm({ type: 'ads', amount: '', description: '' });
      setRecords(prev => [json.data, ...prev]);
      if (stats) setStats((s: any) => ({ ...s, thisTotal: s.thisTotal + Number(form.amount) }));
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
  };

  const byType    = stats?.byType ?? {};
  const thisTotal = stats?.thisTotal ?? 0;
  const lastTotal = stats?.lastTotal ?? 0;
  const growth    = stats?.growth ?? 0;

  // Donut data
  const donutData = Object.entries(byType).map(([key, val]) => ({
    name:  SOURCE_CONFIG[key]?.label || key,
    value: val as number,
    color: SOURCE_CONFIG[key]?.color || '#6B7280',
  }));

  // Trend data (simulasi 7 hari — akan diganti real data nanti)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      date:      d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      total:     Math.floor(Math.random() * 2000000) + 500000,
      ads:       Math.floor(Math.random() * 1000000) + 200000,
      mitra:     Math.floor(Math.random() * 500000)  + 100000,
      basumbang: Math.floor(Math.random() * 200000)  + 50000,
    };
  });

  // Top produk dari records
  const topProducts: Record<string, { total: number; count: number }> = {};
  records.forEach(r => {
    const key = r.type;
    if (!topProducts[key]) topProducts[key] = { total: 0, count: 0 };
    topProducts[key].total += r.amount || 0;
    topProducts[key].count++;
  });
  const topList = Object.entries(topProducts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: '#F9FAFB' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💰 Unified Revenue Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Ringkasan pendapatan dari semua layanan TeraLoka</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          + Catat Revenue
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Memuat data keuangan...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg, #1B6B4A, #0F4A34)', border: '1px solid #1B6B4A', borderRadius: 14, padding: '18px 20px', gridColumn: '1' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</p>
              <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#fff' }}>{formatRp(thisTotal)}</p>
              <p style={{ margin: 0, fontSize: 12, color: growth >= 0 ? '#86EFAC' : '#FCA5A5' }}>
                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% dari bulan sebelumnya
              </p>
            </div>
            {Object.entries(SOURCE_CONFIG).slice(0, 4).map(([key, cfg]) => (
              <div key={key} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{cfg.label}</p>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: cfg.color }}>{formatRp(byType[key] || 0)}</p>
                <p style={{ margin: 0, fontSize: 11, color: thisTotal > 0 ? '#6B7280' : '#4B5563' }}>
                  {thisTotal > 0 ? `${Math.round(((byType[key] || 0) / thisTotal) * 100)}% dari total` : '0%'}
                </p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

            {/* Multi-line trend chart */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Tren Pendapatan</p>
                <span style={{ fontSize: 11, color: '#6B7280' }}>7 Hari Terakhir</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => formatRp(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="total"     stroke="#4ADE80" strokeWidth={2.5} dot={false} name="Total" />
                  <Line type="monotone" dataKey="ads"       stroke="#1B6B4A" strokeWidth={2}   dot={false} name="Ads" />
                  <Line type="monotone" dataKey="mitra"     stroke="#0891B2" strokeWidth={2}   dot={false} name="Mitra" />
                  <Line type="monotone" dataKey="basumbang" stroke="#E8963A" strokeWidth={2}   dot={false} name="Basumbang" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Donut revenue by source */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Revenue by Source</p>
              {donutData.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <p style={{ color: '#4B5563', fontSize: 13 }}>Belum ada data revenue</p>
                  <button onClick={() => setShowForm(true)} style={{ padding: '6px 14px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                    Catat Revenue Pertama
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => formatRp(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {donutData.map((d, i) => {
                      const pct = thisTotal > 0 ? Math.round((d.value / thisTotal) * 100) : 0;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{d.name}</span>
                          </div>
                          <p style={{ margin: '0 0 2px 14px', fontSize: 13, fontWeight: 700, color: d.color }}>{formatRp(d.value)}</p>
                          <div style={{ marginLeft: 14, height: 3, background: '#1F2937', borderRadius: 2 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row — Funnel + Performa + Transaksi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>

            {/* Funnel */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Funnel Konversi</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FUNNEL_DATA.map((f, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{f.label}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>{f.desc}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: '#1F2937', borderRadius: 2 }}>
                      <div style={{ width: `${f.pct}%`, height: '100%', background: f.color, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performa per layanan */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Performa per Layanan</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Layanan', 'Revenue', '%'].map(h => (
                      <th key={h} style={{ padding: '4px 0', textAlign: h === 'Layanan' ? 'left' : 'right', fontSize: 10, color: '#6B7280', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => {
                    const amt = byType[key] || 0;
                    const pct = thisTotal > 0 ? Math.round((amt / thisTotal) * 100) : 0;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid #111827' }}>
                        <td style={{ padding: '8px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{cfg.icon}</span>
                            <span style={{ color: '#F9FAFB', fontWeight: 500 }}>{cfg.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: cfg.color, fontWeight: 700 }}>{formatRp(amt)}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#6B7280' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '1px solid #1F2937' }}>
                    <td style={{ padding: '8px 0', fontWeight: 700, color: '#F9FAFB' }}>Total</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#4ADE80' }}>{formatRp(thisTotal)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#4ADE80', fontWeight: 700 }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Produk terlaris */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Produk / Layanan Terlaris</p>
              {topList.length === 0 ? (
                <p style={{ color: '#4B5563', fontSize: 13 }}>Belum ada data</p>
              ) : topList.map(([key, val], i) => {
                const cfg   = SOURCE_CONFIG[key] || { label: key, color: '#9CA3AF', icon: '💰' };
                const pct   = thisTotal > 0 ? Math.round((val.total / thisTotal) * 100) : 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#374151', width: 16, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{cfg.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{formatRp(val.total)}</span>
                      </div>
                      <div style={{ height: 3, background: '#1F2937', borderRadius: 2 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 2 }} />
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6B7280' }}>{val.count} transaksi · {pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gateway threshold alert */}
          <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: thisTotal >= 10000000 ? 'rgba(27,107,74,0.15)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${thisTotal >= 10000000 ? 'rgba(27,107,74,0.3)' : 'rgba(251,191,36,0.2)'}` }}>
            {thisTotal >= 10000000 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>
                🎉 Revenue bulan ini sudah &gt; Rp 10jt — saatnya aktifkan payment gateway!
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#FCD34D', fontWeight: 600 }}>
                  📊 Progress ke Rp 10jt: {formatRp(thisTotal)} / Rp 10.000.000 ({Math.round((thisTotal / 10000000) * 100)}%)
                </p>
                <div style={{ height: 6, background: '#1F2937', borderRadius: 3, flex: 1, minWidth: 120, maxWidth: 200 }}>
                  <div style={{ width: `${Math.min((thisTotal / 10000000) * 100, 100)}%`, height: '100%', background: '#FCD34D', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Form + Transaksi terbaru */}
          <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 360px' : '1fr', gap: 14 }}>

            {/* Transaksi terbaru */}
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Transaksi Terbaru</p>
                <span style={{ fontSize: 12, color: '#6B7280' }}>Total {records.length} transaksi</span>
              </div>
              {records.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                  Belum ada catatan revenue. Klik "Catat Revenue" untuk mulai.
                </div>
              ) : records.map((r, i) => {
                const cfg = SOURCE_CONFIG[r.type] || { label: r.type, color: '#9CA3AF', icon: '💰' };
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < records.length - 1 ? '1px solid #1F2937' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                        <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span> · {formatDate(r.recorded_at)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4ADE80' }}>{formatRp(r.amount)}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '1px 6px', borderRadius: 10 }}>Lunas</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form catat revenue */}
            {showForm && (
              <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '18px', height: 'fit-content', position: 'sticky', top: 80 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Catat Revenue Manual</p>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Sumber Revenue</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}>
                    {Object.entries(SOURCE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nominal (Rp) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="150000"
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deskripsi *</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder='Iklan "Toko Rempah" paket Starter'
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <div style={{ background: '#0D1117', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>
                    💡 Revenue akan otomatis tercatat saat iklan diaktifkan. Form ini untuk pencatatan manual (Mitra, Komisi, dll).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddRevenue}
                    style={{ flex: 1, padding: '9px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    Simpan
                  </button>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#9CA3AF' }}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
