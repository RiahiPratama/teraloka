'use client';

import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ────────────────────────────────────────────────
const Icons = {
  Save:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Loader:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Check:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  AlertTriangle: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Scale:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>,
  Calendar:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  User:      () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

type Config = {
  key: string;
  value: number;
  unit: string;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

function formatRp(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return Number(String(s).replace(/\D/g, '')) || 0;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminFundingSettings() {
  const { t } = useContext(AdminThemeContext);
  const { user, token, isLoading: authLoading } = useAuth();

  const [configs, setConfigs] = useState<Config[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/config?category=zakat`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConfigs(json.data);
        const initialEdits: Record<string, string> = {};
        json.data.forEach((c: Config) => {
          initialEdits[c.key] = String(Math.round(Number(c.value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        });
        setEdits(initialEdits);
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal memuat data. Coba refresh.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(key: string) {
    if (!token) {
      setMessage({ type: 'error', text: 'Session tidak valid. Login ulang.' });
      return;
    }

    const newValue = parseRp(edits[key] || '0');
    if (newValue <= 0) {
      setMessage({ type: 'error', text: 'Nilai harus lebih dari 0.' });
      return;
    }

    try {
      setSaving(key);
      setMessage(null);

      const res = await fetch(`${API}/config/${key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: newValue }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage({ type: 'success', text: `✓ ${getDisplayName(key)} berhasil diperbarui.` });
        await loadConfigs();
        setSubNavRefresh(r => r + 1);
      } else {
        setMessage({ type: 'error', text: json.error?.message ?? 'Gagal menyimpan.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Coba lagi.' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  function getDisplayName(key: string): string {
    const map: Record<string, string> = {
      zakat_harga_beras_per_kg: 'Harga Beras',
      zakat_harga_emas_per_gram: 'Harga Emas',
    };
    return map[key] ?? key;
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textDim }}>
        <Icons.Loader />
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin_funding')) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          maxWidth: 360,
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 24, textAlign: 'center',
        }}>
          <div style={{
            margin: '0 auto 12px', width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.Alert />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>Akses Ditolak</p>
          <p style={{ fontSize: 12, color: t.textDim, marginBottom: 16 }}>
            Hanya super admin atau admin funding yang bisa akses halaman ini.
          </p>
          <Link href="/admin/funding" style={{ fontSize: 12, fontWeight: 700, color: '#EC4899', textDecoration: 'none' }}>
            ← Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Pengaturan</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        Pengaturan BADONASI
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Harga acuan untuk kalkulator zakat. Update saat ada perubahan pasar.
      </p>

      <AdminFundingSubNav refreshKey={subNavRefresh} />

      {/* Alert message */}
      {message && (
        <div style={{
          marginBottom: 20,
          background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: message.type === 'success' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: message.type === 'success' ? '#10B981' : '#EF4444', flexShrink: 0 }}>
            {message.type === 'success' ? <Icons.Check /> : <Icons.Alert />}
          </span>
          <p style={{
            fontSize: 13, fontWeight: 600,
            color: message.type === 'success' ? '#10B981' : '#EF4444',
          }}>
            {message.text}
          </p>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 720 }}>

        {loading ? (
          <div style={{
            background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
            borderRadius: 16, padding: 40, textAlign: 'center',
          }}>
            <div style={{ display: 'inline-flex', color: t.textDim, marginBottom: 8 }}>
              <Icons.Loader />
            </div>
            <p style={{ fontSize: 12, color: t.textDim }}>Memuat konfigurasi...</p>
          </div>
        ) : configs.length === 0 ? (
          <div style={{
            background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
            borderRadius: 16, padding: 40, textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: t.textDim }}>Belum ada konfigurasi.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Zakat Config Card */}
            <div style={{
              background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#EC4899' }}><Icons.Scale /></span>
                <h2 style={{
                  fontSize: 13, fontWeight: 700, color: t.textPrimary,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Harga Acuan Zakat
                </h2>
              </div>
              <p style={{ fontSize: 12, color: t.textDim, marginBottom: 20, lineHeight: 1.5 }}>
                Nilai ini dipakai di kalkulator zakat publik. Update saat harga pasar berubah signifikan.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {configs.map(c => {
                  const currentValue = parseRp(edits[c.key] || '0');
                  const hasChanged = currentValue !== Number(c.value);
                  const isSaving = saving === c.key;

                  return (
                    <div key={c.key} style={{
                      borderRadius: 12, border: `1px solid ${t.sidebarBorder}`, padding: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
                            {getDisplayName(c.key)}
                          </p>
                          {c.description && (
                            <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.5 }}>{c.description}</p>
                          )}
                        </div>
                        <span style={{
                          flexShrink: 0,
                          fontSize: 10, fontWeight: 700, color: t.textDim,
                          background: t.navHover,
                          padding: '4px 10px', borderRadius: 999,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {c.unit}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 13, fontWeight: 600, color: t.textMuted,
                          }}>Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={edits[c.key] ?? ''}
                            onChange={e => setEdits({
                              ...edits,
                              [c.key]: String(parseRp(e.target.value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
                            })}
                            style={{
                              width: '100%', padding: '10px 14px 10px 36px',
                              borderRadius: 10,
                              border: `1px solid ${hasChanged ? '#EC4899' : t.sidebarBorder}`,
                              background: t.mainBg, color: t.textPrimary,
                              fontSize: 14, fontWeight: 600,
                              outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleSave(c.key)}
                          disabled={isSaving || !hasChanged}
                          style={{
                            flexShrink: 0,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 16px', borderRadius: 10, border: 'none',
                            background: hasChanged && !isSaving
                              ? 'linear-gradient(135deg, #1B6B4A, #0F4C2F)'
                              : t.navHover,
                            color: hasChanged && !isSaving ? '#fff' : t.textMuted,
                            fontSize: 13, fontWeight: 700,
                            cursor: hasChanged && !isSaving ? 'pointer' : 'not-allowed',
                            transition: 'opacity .15s',
                          }}>
                          {isSaving ? <Icons.Loader /> : <Icons.Save />}
                          Simpan
                        </button>
                      </div>

                      {hasChanged && (
                        <div style={{
                          marginTop: 8, display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: '#F59E0B',
                        }}>
                          <Icons.AlertTriangle />
                          <span>
                            Nilai akan berubah dari <strong>{formatRp(Number(c.value))}</strong> → <strong>{formatRp(currentValue)}</strong>
                          </span>
                        </div>
                      )}

                      <div style={{
                        marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.sidebarBorder}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                        fontSize: 10, color: t.textMuted,
                      }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icons.Calendar />
                          <span>{formatDate(c.updated_at)}</span>
                        </div>
                        {c.updated_by && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.User />
                            <span style={{ fontFamily: 'monospace', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.updated_by.slice(0, 8)}...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info note */}
            <div style={{
              background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 16, padding: 14,
            }}>
              <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.6 }}>
                <strong style={{ color: t.textPrimary }}>Catatan:</strong> Kalkulator zakat publik akan menggunakan nilai terbaru dalam ~1 jam setelah perubahan (cache Next.js). Untuk force refresh segera, hubungi developer.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
