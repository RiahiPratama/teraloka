'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface AdPackage { id: string; name: string; slug: string; positions: string[]; duration_days: number; price: number; }
interface Ad {
  id: string; advertiser_name: string; advertiser_phone?: string;
  title: string; body?: string; image_url?: string; link_url: string;
  positions: string[]; starts_at?: string; ends_at?: string;
  impression_count: number; click_count: number;
  billing_model: string; price_paid: number; status: string;
  payment_proof_url?: string; paid_at?: string;
  ad_packages?: { name: string; slug: string; price: number };
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Menunggu Bayar', color: '#D97706', bg: '#FEF3C7' },
  active:          { label: 'Tayang',         color: '#059669', bg: '#D1FAE5' },
  paused:          { label: 'Dijeda',          color: '#6B7280', bg: '#F3F4F6' },
  expired:         { label: 'Selesai',         color: '#DC2626', bg: '#FEE2E2' },
};

const POSITION_LABEL: Record<string, string> = {
  native: 'Native Feed', sidebar: 'Sidebar',
  banner: 'Banner Atas', homepage: 'Homepage',
};

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminAdsPage() {
  const { token } = useAuth();
  const [ads,       setAds]       = useState<Ad[]>([]);
  const [packages,  setPackages]  = useState<AdPackage[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [filter,    setFilter]    = useState('');
  const [toast,     setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const [form, setForm] = useState({
    advertiser_name: '', advertiser_phone: '', package_id: '',
    title: '', body: '', link_url: '', price_paid: 0,
  });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API}/admin/ads?limit=20${filter ? `&status=${filter}` : ''}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setAds(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch { showToast('Gagal memuat iklan', 'err'); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => {
    if (!token) return;
    fetchAds();
    fetch(`${API}/admin/ads/packages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPackages(d.data ?? [])).catch(() => {});
  }, [fetchAds, token]);

  const handleCreate = async () => {
    if (!form.advertiser_name || !form.package_id || !form.title || !form.link_url) {
      showToast('Lengkapi semua field wajib', 'err'); return;
    }
    try {
      const res  = await fetch(`${API}/admin/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Iklan berhasil dibuat');
      setShowForm(false);
      setForm({ advertiser_name: '', advertiser_phone: '', package_id: '', title: '', body: '', link_url: '', price_paid: 0 });
      fetchAds();
    } catch (err: any) { showToast(err.message || 'Gagal membuat iklan', 'err'); }
  };

  const handleActivate = async (id: string) => {
    setProcessing(id);
    try {
      const res  = await fetch(`${API}/admin/ads/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Iklan diaktifkan & revenue tercatat');
      fetchAds();
    } catch (err: any) { showToast(err.message || 'Gagal mengaktifkan', 'err'); }
    finally { setProcessing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan iklan ini?')) return;
    setProcessing(id);
    try {
      await fetch(`${API}/admin/ads/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Iklan dinonaktifkan');
      fetchAds();
    } catch { showToast('Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  const selectedPkg = packages.find(p => p.id === form.package_id);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F9FAFB' }}>📢 Manajemen Iklan</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Kelola iklan mitra & pantau performa</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          + Buat Iklan Baru
        </button>
      </div>

      {/* Paket summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {packages.map(pkg => (
          <div key={pkg.id} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{pkg.name}</p>
            <p style={{ margin: '4px 0', fontSize: 20, fontWeight: 800, color: '#4ADE80' }}>{formatRp(pkg.price)}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{pkg.duration_days} hari · {pkg.positions.map(p => POSITION_LABEL[p] || p).join(', ')}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'pending_payment', 'active', 'expired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === s ? '#1B6B4A' : '#374151'}`, background: filter === s ? 'rgba(27,107,74,0.15)' : 'transparent', color: filter === s ? '#4ADE80' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {s === '' ? 'Semua' : STATUS_LABEL[s]?.label || s}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280', alignSelf: 'center' }}>{total} iklan</span>
      </div>

      {/* Form buat iklan */}
      {showForm && (
        <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#F9FAFB' }}>Buat Iklan Baru</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'advertiser_name', label: 'Nama Pengiklan *', placeholder: 'Toko Rempah Ternate' },
              { key: 'advertiser_phone', label: 'Nomor WA', placeholder: '08123456789' },
              { key: 'title', label: 'Judul Iklan *', placeholder: 'Kopi Rempah 100% Asli Maluku' },
              { key: 'link_url', label: 'Link Tujuan *', placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deskripsi Iklan</label>
              <input value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="Nikmati kopi rempah pilihan dari Maluku Utara..."
                style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Paket Iklan *</label>
              <select value={form.package_id} onChange={e => {
                const pkg = packages.find(p => p.id === e.target.value);
                setForm(p => ({ ...p, package_id: e.target.value, price_paid: pkg?.price || 0 }));
              }}
                style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">-- Pilih Paket --</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} — {formatRp(p.price)} / {p.duration_days} hari</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: 4 }}>Harga Dibayar</label>
              <input type="number" value={form.price_paid} onChange={e => setForm(p => ({ ...p, price_paid: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {selectedPkg && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(27,107,74,0.1)', borderRadius: 8, border: '1px solid rgba(27,107,74,0.2)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#4ADE80' }}>
                ✅ Paket {selectedPkg.name}: Tayang di {selectedPkg.positions.map(p => POSITION_LABEL[p] || p).join(', ')} selama {selectedPkg.duration_days} hari
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate}
              style={{ padding: '8px 20px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              Simpan Iklan
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#9CA3AF' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel iklan */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Memuat iklan...</div>
      ) : ads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4B5563' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
          <p style={{ color: '#9CA3AF', fontWeight: 600 }}>Belum ada iklan</p>
          <p style={{ color: '#6B7280', fontSize: 13 }}>Klik "Buat Iklan Baru" untuk memulai</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ads.map(ad => {
            const st = STATUS_LABEL[ad.status] || { label: ad.status, color: '#9CA3AF', bg: '#1F2937' };
            const ctr = ad.impression_count > 0 ? ((ad.click_count / ad.impression_count) * 100).toFixed(2) : '0.00';
            return (
              <div key={ad.id} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

                  {/* Info utama */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}22`, border: `1px solid ${st.color}44` }}>
                        {st.label}
                      </span>
                      {ad.ad_packages && (
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{ad.ad_packages.name}</span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>{ad.title}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280' }}>{ad.advertiser_name} {ad.advertiser_phone ? `· ${ad.advertiser_phone}` : ''}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {ad.positions.map(p => (
                        <span key={p} style={{ fontSize: 10, fontWeight: 600, color: '#0891B2', background: 'rgba(8,145,178,0.1)', padding: '1px 8px', borderRadius: 20 }}>
                          {POSITION_LABEL[p] || p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F9FAFB' }}>{ad.impression_count.toLocaleString('id-ID')}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>Impresi</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F9FAFB' }}>{ad.click_count.toLocaleString('id-ID')}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>Klik</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#4ADE80' }}>{ctr}%</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>CTR</p>
                    </div>
                  </div>

                  {/* Period + price */}
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#4ADE80' }}>{formatRp(ad.price_paid)}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#6B7280' }}>{formatDate(ad.starts_at)} –</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{formatDate(ad.ends_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #1F2937', paddingTop: 12 }}>
                  {ad.status === 'pending_payment' && (
                    <button onClick={() => handleActivate(ad.id)} disabled={processing === ad.id}
                      style={{ padding: '5px 14px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', opacity: processing === ad.id ? 0.5 : 1 }}>
                      {processing === ad.id ? '...' : '✓ Konfirmasi Bayar & Aktifkan'}
                    </button>
                  )}
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>
                    Lihat Link ↗
                  </a>
                  {ad.status !== 'expired' && (
                    <button onClick={() => handleDelete(ad.id)} disabled={processing === ad.id}
                      style={{ padding: '5px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#EF4444', opacity: processing === ad.id ? 0.5 : 1, marginLeft: 'auto' }}>
                      Nonaktifkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
