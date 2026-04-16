'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Settings {
  viral_threshold_views: number;
  viral_threshold_shares: number;
  viral_window_hours: number;
}

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    viral_threshold_views: 500,
    viral_threshold_shares: 50,
    viral_window_hours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('Setting berhasil disimpan ✓');
    } catch (err: any) {
      showToast(err.message || 'Gagal simpan setting', false);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, desc, field, min, max, unit,
  }: {
    label: string; desc: string;
    field: keyof Settings; min: number; max: number; unit: string;
  }) => (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{desc}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <input
            type="number"
            min={min}
            max={max}
            value={settings[field]}
            onChange={e => setSettings(prev => ({ ...prev, [field]: Number(e.target.value) }))}
            style={{
              width: 90, padding: '8px 12px', borderRadius: 8,
              border: '2px solid #E5E7EB', fontSize: 16, fontWeight: 700,
              color: '#111827', textAlign: 'center', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = '#1B6B4A')}
            onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
          />
          <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            ⚙️ Pengaturan Platform
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
            Konfigurasi threshold dan perilaku platform
          </p>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none', padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8 }}>
          ← Overview
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Memuat setting...
        </div>
      ) : (
        <>
          {/* Section: Viral */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingLeft: 4 }}>
              🔥 Threshold Konten Viral
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field
                label="Minimum Views"
                desc="Artikel dianggap viral jika mencapai jumlah views ini dalam window waktu yang ditentukan."
                field="viral_threshold_views"
                min={100} max={10000} unit="views"
              />
              <Field
                label="Minimum Share"
                desc="Artikel dianggap viral jika dibagikan minimal sebanyak ini dalam window waktu yang ditentukan."
                field="viral_threshold_shares"
                min={10} max={1000} unit="share"
              />
              <Field
                label="Window Waktu"
                desc="Periode waktu (dalam jam) untuk menghitung views dan share apakah artikel bisa dianggap viral."
                field="viral_window_hours"
                min={1} max={168} unit="jam"
              />
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: 'rgba(27,107,74,0.04)', border: '1px solid rgba(27,107,74,0.15)',
            borderRadius: 12, padding: '12px 16px', margin: '16px 0',
            fontSize: 12, color: '#374151', lineHeight: 1.6,
          }}>
            💡 <strong>Contoh:</strong> Dengan setting saat ini, artikel dianggap viral jika mendapat{' '}
            <strong>{settings.viral_threshold_views.toLocaleString('id-ID')} views</strong> atau{' '}
            <strong>{settings.viral_threshold_shares} share</strong> dalam{' '}
            <strong>{settings.viral_window_hours} jam</strong> terakhir.
            Artikel viral akan muncul dengan badge 🔥 di BAKABAR.
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '13px', borderRadius: 12,
              border: 'none', background: saving ? '#9CA3AF' : '#1B6B4A',
              color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </>
      )}
    </div>
  );
}
