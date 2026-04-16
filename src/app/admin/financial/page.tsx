'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  ads:          { label: 'Iklan',        color: '#0891B2', icon: '📢' },
  mitra:        { label: 'Mitra',        color: '#D97706', icon: '🤝' },
  commission:   { label: 'Komisi',       color: '#7C3AED', icon: '🚢' },
  platform_fee: { label: 'Platform Fee', color: '#059669', icon: '💚' },
};

export default function AdminFinancialPage() {
  const { token } = useAuth();
  const [stats,    setStats]    = useState<any>(null);
  const [records,  setRecords]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [form, setForm] = useState({ type: 'ads', amount: '', description: '' });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const growth = stats?.growth ?? 0;
  const byType = stats?.byType ?? {};

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F9FAFB' }}>💰 Keuangan TeraLoka</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Pantau revenue & catat pendapatan manual</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          + Catat Revenue
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Memuat data keuangan...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>REVENUE BULAN INI</p>
              <p style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#4ADE80' }}>
                {formatRp(stats?.thisTotal ?? 0)}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: growth >= 0 ? '#4ADE80' : '#EF4444' }}>
                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% vs bulan lalu
              </p>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>BULAN LALU</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#9CA3AF' }}>
                {formatRp(stats?.lastTotal ?? 0)}
              </p>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>IKLAN AKTIF</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F9FAFB' }}>
                {stats?.activeAds ?? 0}
              </p>
            </div>
          </div>

          {/* Breakdown per sumber */}
          {Object.keys(byType).length > 0 && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>Breakdown Sumber Revenue</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {Object.entries(byType).map(([type, amount]) => {
                  const t = TYPE_LABEL[type] || { label: type, color: '#9CA3AF', icon: '💰' };
                  const pct = stats?.thisTotal > 0 ? Math.round(((amount as number) / stats.thisTotal) * 100) : 0;
                  return (
                    <div key={type} style={{ padding: '12px 14px', background: '#0D1117', borderRadius: 10, border: `1px solid ${t.color}33` }}>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: t.color, fontWeight: 600 }}>{t.icon} {t.label}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#F9FAFB' }}>{formatRp(amount as number)}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{pct}% dari total</p>
                      {/* Progress bar */}
                      <div style={{ marginTop: 6, height: 3, background: '#1F2937', borderRadius: 2 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gateway threshold */}
          {(stats?.thisTotal ?? 0) > 0 && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10,
              background: stats.thisTotal >= 10000000 ? 'rgba(27,107,74,0.15)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${stats.thisTotal >= 10000000 ? 'rgba(27,107,74,0.3)' : 'rgba(251,191,36,0.2)'}` }}>
              <p style={{ margin: 0, fontSize: 13, color: stats.thisTotal >= 10000000 ? '#4ADE80' : '#FCD34D', fontWeight: 600 }}>
                {stats.thisTotal >= 10000000
                  ? '🎉 Revenue bulan ini sudah > Rp 10jt — saatnya aktifkan payment gateway!'
                  : `📊 Progress ke Rp 10jt: ${formatRp(stats.thisTotal)} / Rp 10.000.000 (${Math.round((stats.thisTotal / 10000000) * 100)}%)`}
              </p>
            </div>
          )}

          {/* Form tambah revenue */}
          {showForm && (
            <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#F9FAFB' }}>Catat Revenue Manual</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipe Revenue</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nominal (Rp)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="150000"
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deskripsi</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder='Iklan "Toko Rempah Ternate" paket Starter'
                    style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={handleAddRevenue}
                  style={{ padding: '8px 20px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  Simpan
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#9CA3AF' }}>
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Riwayat revenue */}
          <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1F2937' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>Riwayat Pendapatan</p>
            </div>
            {records.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                Belum ada catatan revenue. Klik "Catat Revenue" untuk mulai.
              </div>
            ) : (
              records.map((r, i) => {
                const t = TYPE_LABEL[r.type] || { label: r.type, color: '#9CA3AF', icon: '💰' };
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < records.length - 1 ? '1px solid #1F2937' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>{r.description}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                        <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span> · {formatDate(r.recorded_at)}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4ADE80', flexShrink: 0 }}>
                      {formatRp(r.amount)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
