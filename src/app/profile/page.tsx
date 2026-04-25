'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ROLE_INFO: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  super_admin:     { label: 'Super Admin',     color: '#1B6B4A', bg: 'rgba(27,107,74,0.1)',    desc: 'Akses penuh ke semua fitur admin' },
  admin_content:   { label: 'Admin Konten',    color: '#E8963A', bg: 'rgba(232,150,58,0.1)',   desc: 'Kelola artikel dan laporan BAKABAR' },
  admin_transport: { label: 'Admin Transport', color: '#E8963A', bg: 'rgba(232,150,58,0.1)',   desc: 'Kelola transportasi speed boat & kapal' },
  admin_listing:   { label: 'Admin Listing',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)',   desc: 'Kelola listing properti & kos' },
  admin_funding:   { label: 'Admin Funding',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)',   desc: 'Kelola kampanye BADONASI' },
  owner_listing:   { label: 'Owner Listing',   color: '#0891B2', bg: 'rgba(8,145,178,0.1)',    desc: 'Pemilik listing kos, properti, atau kendaraan' },
  operator_speed:  { label: 'Operator Speed',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   desc: 'Operator speed boat antar pulau' },
  operator_ship:   { label: 'Operator Kapal',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   desc: 'Operator kapal penumpang / ferry' },
  service_user:    { label: 'User Biasa',       color: '#6B7280', bg: 'rgba(107,114,128,0.1)', desc: 'Konsumen dan pengguna umum TeraLoka' },
};

export default function ProfilePage() {
  const { user, token, isLoading, updateProfile, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // ⭐ FIX-E: KYC state untuk Card "Verifikasi Penggalang BADONASI"
  const [kycStatus, setKycStatus] = useState<'incomplete' | 'pending_verification' | 'verified' | 'loading'>('loading');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/profile');
    if (user?.name) setName(user.name);
  }, [user, isLoading, router]);

  // ⭐ FIX-E: Fetch creator profile status
  useEffect(() => {
    if (!user || !token) return;
    const fetchKyc = async () => {
      try {
        const res = await fetch(`${API_URL}/me/creator-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setKycStatus('incomplete');
          return;
        }
        const data = await res.json();
        setKycStatus(data?.data?.status ?? 'incomplete');
      } catch {
        setKycStatus('incomplete');
      }
    };
    fetchKyc();
  }, [user, token]);

  const handleSave = async () => {
    if (!name.trim() || !token) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      await updateProfile(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const roleInfo = ROLE_INFO[user.role] ?? ROLE_INFO['service_user'];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit', system-ui", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D2818, #1B6B4A)',
        padding: '48px 20px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 20 }}>← Beranda</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar besar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
            }}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
                {name || 'Belum isi nama'}
              </h1>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 4, background: 'rgba(255,255,255,0.12)',
                padding: '4px 10px', borderRadius: 20,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '-24px auto 0', padding: '0 16px', position: 'relative' }}>

        {/* Role card */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '16px',
          border: `1px solid ${roleInfo.color}30`,
          marginBottom: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: roleInfo.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {user.role === 'super_admin' ? '⚡' :
               user.role.startsWith('admin') ? '🛡️' :
               user.role === 'owner_listing' ? '🏠' :
               user.role.startsWith('operator') ? '🚢' : '👤'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: roleInfo.color }}>{roleInfo.label}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{roleInfo.desc}</div>
            </div>
          </div>
        </div>

        {/* ⭐ FIX-E: KYC Quick Card — Verifikasi Penggalang BADONASI */}
        {(() => {
          const kycMeta = (() => {
            if (kycStatus === 'verified') return {
              emoji: '🟢',
              label: 'TERVERIFIKASI',
              labelColor: '#047857',
              labelBg: 'rgba(4,120,87,0.1)',
              desc: 'Identitas kamu sudah diverifikasi admin. Bisa galang dana langsung.',
              btnText: 'Kelola Verifikasi',
              btnHref: '/owner/profile',
              btnBg: '#1B6B4A',
            };
            if (kycStatus === 'pending_verification') return {
              emoji: '🟡',
              label: 'MENUNGGU VERIFIKASI',
              labelColor: '#B45309',
              labelBg: 'rgba(180,83,9,0.1)',
              desc: 'Tim TeraLoka sedang meninjau dokumen kamu. Sambil menunggu, kamu sudah bisa galang dana.',
              btnText: 'Lihat Detail',
              btnHref: '/owner/profile',
              btnBg: '#B45309',
            };
            if (kycStatus === 'loading') return {
              emoji: '⏳',
              label: 'MEMUAT...',
              labelColor: '#6B7280',
              labelBg: 'rgba(107,114,128,0.1)',
              desc: 'Sedang memuat status verifikasi...',
              btnText: 'Lihat Detail',
              btnHref: '/owner/profile',
              btnBg: '#9CA3AF',
            };
            return {
              emoji: '🔴',
              label: 'BELUM LENGKAP',
              labelColor: '#B91C1C',
              labelBg: 'rgba(185,28,28,0.1)',
              desc: 'Lengkapi profil verifikasi untuk bisa galang dana donasi di TeraLoka.',
              btnText: 'Lengkapi Sekarang',
              btnHref: '/owner/profile/complete',
              btnBg: '#1B6B4A',
            };
          })();

          return (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: '18px',
              border: `2px solid ${kycMeta.labelColor}30`,
              marginBottom: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(27,107,74,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  🛡️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                    Verifikasi Penggalang BADONASI
                  </h2>
                  <p style={{ fontSize: 11, color: '#6B7280' }}>
                    Wajib untuk galang dana donasi
                  </p>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: kycMeta.labelBg,
                padding: '5px 10px', borderRadius: 20,
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 12 }}>{kycMeta.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: kycMeta.labelColor, letterSpacing: '0.5px' }}>
                  {kycMeta.label}
                </span>
              </div>

              <p style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5, marginBottom: 14 }}>
                {kycMeta.desc}
              </p>

              <Link href={kycMeta.btnHref} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '11px', borderRadius: 10,
                background: kycMeta.btnBg, color: '#fff',
                fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                {kycMeta.btnText} →
              </Link>
            </div>
          );
        })()}

        {/* Edit form */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px',
          border: '1px solid #E5E7EB', marginBottom: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Informasi Profil
          </h2>

          {/* Nomor WA (read only) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
              Nomor WhatsApp
            </label>
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              fontSize: 14, color: '#9CA3AF',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>📱</span>
              <span>+{user.phone}</span>
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                color: '#10B981', background: 'rgba(16,185,129,0.1)',
                padding: '2px 6px', borderRadius: 10,
              }}>Terverifikasi</span>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Nomor WA tidak bisa diubah — digunakan untuk login
            </p>
          </div>

          {/* Nama */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nama Lengkap
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Masukkan nama lengkap kamu..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${saved ? '#10B981' : '#E5E7EB'}`,
                fontSize: 14, outline: 'none', transition: 'border 0.2s',
                boxSizing: 'border-box', color: '#111827',
              }}
              onFocus={(e) => e.target.style.borderColor = '#1B6B4A'}
              onBlur={(e) => e.target.style.borderColor = saved ? '#10B981' : '#E5E7EB'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#EF4444',
              marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || name.trim() === user.name}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: saved ? '#10B981' : (saving || !name.trim() || name.trim() === user.name) ? '#9CA3AF' : '#1B6B4A',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: (saving || !name.trim() || name.trim() === user.name) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan Nama'}
          </button>
        </div>

        {/* Quick links berdasarkan role */}
        {(user.role === 'super_admin' || user.role.startsWith('admin')) && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>🔧 Akses Cepat Admin</h2>
            </div>
            <div style={{ padding: '8px' }}>
              {[
                { href: '/admin', label: 'Admin Dashboard', icon: '⚡' },
                { href: '/admin/users', label: 'Manajemen Users', icon: '👥' },
                { href: '/admin/listings', label: 'Manajemen Listing', icon: '🏠' },
                { href: '/office/newsroom/bakabar/hub', label: 'Manajemen Konten', icon: '📰' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{item.label}</span>
                  <span style={{ marginLeft: 'auto', color: '#D1D5DB' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {user.role === 'owner_listing' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>🏠 Portal Owner</h2>
            </div>
            <div style={{ padding: '8px' }}>
              {[
                { href: '/owner', label: 'Dashboard Owner', icon: '📊' },
                { href: '/owner/listing/new/kos', label: 'Tambah Listing Kos', icon: '➕' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{item.label}</span>
                  <span style={{ marginLeft: 'auto', color: '#D1D5DB' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: '1px solid #FEE2E2',
            background: 'rgba(239,68,68,0.04)', color: '#EF4444',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
        >
          ⏻ Keluar dari TeraLoka
        </button>
      </div>
    </div>
  );
}
