'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Package {
  id: string;
  name: string;
  slug: string;
  positions: string[];
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}

const POSITION_LABEL: Record<string, string> = {
  native:     'Native Feed',
  sidebar:    'Sidebar',
  banner:     'Banner Atas',
  homepage:   'Homepage',
  in_article: 'Dalam Artikel',
};

const ALL_POSITIONS = ['native', 'sidebar', 'banner', 'homepage', 'in_article'];

const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

export default function PackagesPanel() {
  const { token } = useAuth();
  const { t }     = useAdminTheme();

  const [pkgs,       setPkgs]       = useState<Package[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Package | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    positions: [] as string[],
    duration_days: 7,
    price: 0,
    is_active: true,
  });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const h = { Authorization: `Bearer ${token}` };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/ads/packages/all`, { headers: h });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setPkgs(json.data ?? []);
    } catch (err: any) { showToast(err.message || 'Gagal memuat paket', 'err'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchPackages();
  }, [fetchPackages, token]);

  const resetForm = () => setForm({
    name: '', slug: '', positions: [], duration_days: 7, price: 0, is_active: true,
  });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({
      name:          pkg.name,
      slug:          pkg.slug,
      positions:     pkg.positions,
      duration_days: pkg.duration_days,
      price:         pkg.price,
      is_active:     pkg.is_active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    resetForm();
  };

  const togglePosition = (pos: string) => {
    setForm(p => ({
      ...p,
      positions: p.positions.includes(pos)
        ? p.positions.filter(x => x !== pos)
        : [...p.positions, pos],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim())            return showToast('Nama paket wajib diisi', 'err');
    if (!editing && !form.slug.trim()) return showToast('Slug wajib diisi', 'err');
    if (form.positions.length === 0)  return showToast('Pilih minimal 1 posisi iklan', 'err');
    if (form.duration_days < 1)       return showToast('Durasi minimal 1 hari', 'err');
    if (form.price < 0)               return showToast('Harga tidak boleh negatif', 'err');

    setProcessing('form');
    try {
      const url    = editing ? `${API}/admin/ads/packages/${editing.id}` : `${API}/admin/ads/packages`;
      const method = editing ? 'PUT' : 'POST';
      // Saat edit, slug tidak dikirim (juga di-ignore backend)
      const body   = editing
        ? { name: form.name, positions: form.positions, duration_days: form.duration_days, price: form.price, is_active: form.is_active }
        : form;

      const res  = await fetch(url, {
        method, headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(editing ? '✅ Paket diperbarui' : '✅ Paket ditambahkan');
      closeForm();
      fetchPackages();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Nonaktifkan paket "${pkg.name}"?\n\nPaket akan disembunyikan dari form create iklan. Iklan aktif yang sudah pakai paket ini tidak terpengaruh.`)) return;
    setProcessing(pkg.id);
    try {
      const res  = await fetch(`${API}/admin/ads/packages/${pkg.id}`, { method: 'DELETE', headers: h });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('Paket dinonaktifkan'); fetchPackages();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  const handleToggleActive = async (pkg: Package) => {
    setProcessing(pkg.id);
    try {
      const res  = await fetch(`${API}/admin/ads/packages/${pkg.id}`, {
        method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !pkg.is_active }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`Paket ${pkg.is_active ? 'dinonaktifkan' : 'diaktifkan'}`); fetchPackages();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  const handleReset = async () => {
    if (!confirm('Seed 3 paket default (Starter, Growth, Premium)?\n\nHanya bisa dilakukan saat tidak ada paket sama sekali.')) return;
    setProcessing('reset');
    try {
      const res  = await fetch(`${API}/admin/ads/packages/reset-defaults`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ 3 paket default ditambahkan'); fetchPackages();
    } catch (err: any) { showToast(err.message || 'Gagal', 'err'); }
    finally { setProcessing(null); }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 Paket Iklan</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>Kelola tier paket iklan yang tersedia untuk advertiser</p>
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          + Tambah Paket
        </button>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 380px' : '1fr', gap: 16 }}>

        {/* Table */}
        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Daftar Paket</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              {pkgs.length} paket · {pkgs.filter(p => p.is_active).length} aktif
            </p>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Memuat...</div>
          ) : pkgs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
              <p style={{ color: t.textMuted, fontWeight: 600 }}>Belum ada paket iklan</p>
              <p style={{ color: t.textDim, fontSize: 11, marginTop: 4, marginBottom: 16 }}>
                Seed 3 paket default atau bikin custom
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={handleReset} disabled={processing === 'reset'}
                  style={{ padding: '8px 18px', background: 'rgba(27,107,74,0.1)', border: '1px solid rgba(27,107,74,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1B6B4A' }}>
                  {processing === 'reset' ? '...' : '⚡ Seed Default (Starter, Growth, Premium)'}
                </button>
                <button onClick={openCreate}
                  style={{ padding: '8px 18px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  + Tambah Manual
                </button>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    {['Nama', 'Slug', 'Posisi', 'Durasi', 'Harga', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkgs.map(pkg => (
                    <tr key={pkg.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, opacity: pkg.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: t.textPrimary }}>{pkg.name}</td>
                      <td style={{ padding: '10px 14px', color: t.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{pkg.slug}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {pkg.positions.map(p => (
                            <span key={p} style={{ fontSize: 9, fontWeight: 600, color: '#0891B2', background: 'rgba(8,145,178,0.1)', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                              {POSITION_LABEL[p] || p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: t.textMuted, whiteSpace: 'nowrap' }}>{pkg.duration_days} hari</td>
                      <td style={{ padding: '10px 14px', color: t.codeText, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRp(pkg.price)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pkg.is_active ? '#059669' : '#6B7280', background: pkg.is_active ? 'rgba(5,150,105,0.12)' : 'rgba(107,114,128,0.12)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          ● {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(pkg)}
                            style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#3B82F6', whiteSpace: 'nowrap' }}>
                            ✎ Edit
                          </button>
                          <button onClick={() => handleToggleActive(pkg)} disabled={processing === pkg.id}
                            style={{ padding: '3px 10px', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap' }}>
                            {pkg.is_active ? '⏸ Nonaktif' : '▶ Aktifkan'}
                          </button>
                          {pkg.is_active && (
                            <button onClick={() => handleDelete(pkg)} disabled={processing === pkg.id}
                              style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 10, color: '#EF4444' }}>
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form panel */}
        {showForm && (
          <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: '18px', height: 'fit-content', position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{editing ? 'Edit Paket' : 'Tambah Paket Baru'}</p>
              <button onClick={closeForm}
                style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            {editing && (
              <div style={{ padding: '8px 10px', background: 'rgba(217,119,6,0.1)', borderRadius: 6, marginBottom: 12, border: '1px solid rgba(217,119,6,0.2)' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#D97706', lineHeight: 1.5 }}>
                  ℹ️ Perubahan hanya berlaku untuk iklan baru. Iklan yang sudah aktif tidak terpengaruh.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Nama Paket *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Contoh: Starter, Growth, Premium"
                style={{ width: '100%', padding: '7px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                Slug {editing ? '🔒 (terkunci)' : '*'}
              </label>
              <input value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                disabled={!!editing}
                placeholder="starter, growth, premium"
                style={{ width: '100%', padding: '7px 10px', background: editing ? t.deepBg : t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: editing ? t.textMuted : t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              {!editing && <p style={{ margin: '3px 0 0', fontSize: 10, color: t.textDim }}>Huruf kecil, angka, tanda hubung saja</p>}
              {editing && <p style={{ margin: '3px 0 0', fontSize: 10, color: t.textDim }}>Slug tidak bisa diubah setelah paket dibuat</p>}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Posisi Iklan * (minimal 1)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {ALL_POSITIONS.map(pos => {
                  const active = form.positions.includes(pos);
                  return (
                    <label key={pos} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: active ? 'rgba(27,107,74,0.1)' : t.inputBg, border: `1px solid ${active ? '#1B6B4A' : t.inputBorder}`, borderRadius: 7, cursor: 'pointer' }}>
                      <input type="checkbox" checked={active} onChange={() => togglePosition(pos)}
                        style={{ margin: 0, accentColor: '#1B6B4A' }} />
                      <span style={{ fontSize: 11, color: active ? t.codeText : t.textPrimary, fontWeight: active ? 700 : 500 }}>
                        {POSITION_LABEL[pos]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Durasi (hari) *</label>
                <input type="number" min={1} value={form.duration_days}
                  onChange={e => setForm(p => ({ ...p, duration_days: Math.max(1, Number(e.target.value) || 0) }))}
                  style={{ width: '100%', padding: '7px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Harga (Rp) *</label>
                <input type="number" min={0} step={1000} value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: Math.max(0, Number(e.target.value) || 0) }))}
                  style={{ width: '100%', padding: '7px 10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                <p style={{ margin: '3px 0 0', fontSize: 10, color: t.textDim }}>{formatRp(form.price)}</p>
              </div>
            </div>

            <div style={{ marginBottom: 14, padding: '8px 10px', background: t.inputBg, borderRadius: 7, border: `1px solid ${t.inputBorder}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ margin: 0, accentColor: '#1B6B4A' }} />
                <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>Paket aktif</span>
              </label>
              <p style={{ margin: '4px 0 0 22px', fontSize: 10, color: t.textDim, lineHeight: 1.4 }}>
                Jika aktif, paket tampil di form create iklan. Nonaktifkan untuk sembunyikan tanpa menghapus.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} disabled={processing === 'form'}
                style={{ flex: 1, padding: '9px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {processing === 'form' ? '...' : editing ? 'Update Paket' : 'Simpan Paket'}
              </button>
              <button onClick={closeForm}
                style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${t.inputBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: t.textMuted }}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
