'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Phone, ShieldCheck, ShieldAlert, Clock, Crown, Settings2,
  Home, Ship, User as UserIcon, LayoutDashboard, Users, Newspaper, Plus,
  ClipboardList, HeartHandshake, LogOut, ArrowRight, Check, Loader2, Camera, Trash2, X,
} from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const C = {
  ink: '#0A2E2A',
  forest: '#1B6B4A',
  forestDeep: '#0D2818',
  toska: '#0891B2',
  amber: '#E8963A',
  paper: '#FBFAF6',
  line: '#ECEAE3',
  muted: '#6B7280',
  faint: '#9CA3AF',
};

const ROLE_INFO: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  super_admin:     { label: 'Super Admin',     color: '#1B6B4A', bg: 'rgba(27,107,74,0.08)',  desc: 'Akses penuh ke semua fitur admin' },
  admin_content:   { label: 'Admin Konten',    color: '#E8963A', bg: 'rgba(232,150,58,0.1)',  desc: 'Kelola artikel dan laporan BAKABAR' },
  admin_transport: { label: 'Admin Transport', color: '#E8963A', bg: 'rgba(232,150,58,0.1)',  desc: 'Kelola transportasi speed boat & kapal' },
  admin_listing:   { label: 'Admin Listing',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)',  desc: 'Kelola listing properti & kos' },
  admin_funding:   { label: 'Admin Funding',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)',  desc: 'Kelola kampanye BADONASI' },
  owner_listing:   { label: 'Owner Listing',   color: '#0891B2', bg: 'rgba(8,145,178,0.1)',   desc: 'Pemilik listing kos, properti, atau kendaraan' },
  operator_speed:  { label: 'Operator Speed',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  desc: 'Operator speed boat antar pulau' },
  operator_ship:   { label: 'Operator Kapal',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  desc: 'Operator kapal penumpang / ferry' },
  service_user:    { label: 'User Biasa',       color: '#6B7280', bg: 'rgba(107,114,128,0.1)', desc: 'Konsumen dan pengguna umum TeraLoka' },
};

function RoleIcon({ role, size = 18, color }: { role: string; size?: number; color: string }) {
  const p = { size, color, strokeWidth: 2 };
  if (role === 'super_admin') return <Crown {...p} />;
  if (role.startsWith('admin')) return <ShieldCheck {...p} />;
  if (role === 'owner_listing') return <Home {...p} />;
  if (role.startsWith('operator')) return <Ship {...p} />;
  return <UserIcon {...p} />;
}

export default function ProfilePage() {
  const { user, token, isLoading, updateProfile, savePhone, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Phone (untuk user tanpa nomor — login Google)
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [kycStatus, setKycStatus] = useState<'incomplete' | 'pending_verification' | 'verified' | 'loading'>('loading');

  // Avatar (foto profil)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => { setAvatarUrl(user?.avatar_url ?? null); }, [user?.avatar_url]);

  async function persistAvatar(url: string | null) {
    if (!token) return;
    setAvatarSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_url: url }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message || 'Gagal simpan avatar');
      setAvatarUrl(url);
      setAvatarEditing(false);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan foto');
    } finally {
      setAvatarSaving(false);
    }
  }

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/profile');
    if (user?.name) setName(user.name);
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !token) return;
    const fetchKyc = async () => {
      try {
        const res = await fetch(`${API_URL}/me/creator-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setKycStatus('incomplete'); return; }
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

  const handleSavePhone = async () => {
    const raw = phoneInput.replace(/\D/g, '');
    if (raw.length < 9) { setPhoneError('Nomor terlalu pendek.'); return; }
    setSavingPhone(true);
    setPhoneError('');
    const normalized = raw.startsWith('0') ? '62' + raw.slice(1) : raw.startsWith('62') ? raw : '62' + raw;
    const r = await savePhone(normalized);
    setSavingPhone(false);
    if (r.success) {
      setPhoneSaved(true);
    } else {
      setPhoneError(r.message || 'Gagal menyimpan nomor.');
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.paper }}>
        <Loader2 size={30} color={C.forest} style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const roleInfo = ROLE_INFO[user.role] ?? ROLE_INFO['service_user'];
  const hasPhone = Boolean(user.phone);

  const cardBase: React.CSSProperties = {
    background: '#fff', borderRadius: 20, border: `1px solid ${C.line}`,
    marginBottom: 16, boxShadow: '0 10px 30px -16px rgba(10,46,42,0.18)',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: "'Outfit', system-ui", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header — gradient laut */}
      <div style={{
        background: `radial-gradient(120% 100% at 50% -20%, #0E4D52 0%, ${C.forestDeep} 55%, #071F1C 100%)`,
        padding: '44px 20px 64px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(232,150,58,0.08)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 220, height: 160, borderRadius: '50%', background: 'rgba(8,145,178,0.14)', filter: 'blur(50px)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 22 }}>
            <ChevronLeft size={15} /> Beranda
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 74, height: 74, borderRadius: '50%',
                background: 'rgba(255,255,255,0.14)', border: '3px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 800, color: '#fff', overflow: 'hidden',
                boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (name ? name.charAt(0).toUpperCase() : '?')}
              </div>
              <button
                onClick={() => setAvatarEditing(v => !v)}
                aria-label="Ubah foto profil"
                style={{
                  position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%',
                  background: C.forest, border: '2px solid #fff', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.3)',
                }}
              >
                <Camera size={13} />
              </button>

            </div>

            {avatarEditing && (
              <div
                onClick={() => setAvatarEditing(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(7,31,28,0.55)', backdropFilter: 'blur(3px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#fff', borderRadius: 20, border: `1px solid ${C.line}`,
                    boxShadow: '0 30px 70px -20px rgba(7,31,28,0.6)', padding: 22,
                    width: '100%', maxWidth: 360,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: '-0.2px' }}>Foto Profil</h3>
                    <button onClick={() => setAvatarEditing(false)} aria-label="Tutup" style={{ border: 'none', background: '#F3F4F6', cursor: 'pointer', color: C.muted, display: 'flex', width: 28, height: 28, borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={15} />
                    </button>
                  </div>
                  <p style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
                    Unggah foto persegi, maksimal 1MB (JPG / PNG).
                  </p>

                  {/* Preview avatar saat ini */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
                      background: `linear-gradient(135deg, ${C.forestDeep}, ${C.forest})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 36, fontWeight: 800,
                      border: `3px solid ${C.line}`,
                    }}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (name ? name.charAt(0).toUpperCase() : '?')}
                    </div>
                  </div>

                  <ImageUpload
                    bucket="avatars"
                    label=""
                    maxFiles={1}
                    maxSizeMB={1}
                    onUpload={(urls: string[]) => { const u = urls[0]; if (u) persistAvatar(u); }}
                    existingUrls={avatarUrl ? [avatarUrl] : []}
                  />

                  {avatarUrl && (
                    <button
                      onClick={() => persistAvatar(null)}
                      disabled={avatarSaving}
                      style={{
                        marginTop: 12, width: '100%', padding: '10px', borderRadius: 12,
                        border: '1px solid #FECACA', background: 'rgba(239,68,68,0.04)', color: '#EF4444',
                        fontSize: 12.5, fontWeight: 600, cursor: avatarSaving ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        opacity: avatarSaving ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={14} /> Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: '#fff', fontSize: 23, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.15 }}>
                {name || 'Belum isi nama'}
              </h1>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7,
                background: 'rgba(255,255,255,0.13)', padding: '4px 12px', borderRadius: 20,
                backdropFilter: 'blur(4px)',
              }}>
                <RoleIcon role={user.role} size={13} color="#fff" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{roleInfo.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '-28px auto 0', padding: '0 16px', position: 'relative' }}>

        {/* Role card */}
        <div style={{ ...cardBase, padding: 16, border: `1px solid ${roleInfo.color}22` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: roleInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RoleIcon role={user.role} size={19} color={roleInfo.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: roleInfo.color }}>{roleInfo.label}</div>
              <div style={{ fontSize: 11.5, color: C.faint }}>{roleInfo.desc}</div>
            </div>
          </div>
        </div>

        {/* KYC — Verifikasi Penggalang BADONASI */}
        {(() => {
          const meta = (() => {
            if (kycStatus === 'verified') return {
              Icon: ShieldCheck, label: 'TERVERIFIKASI', labelColor: '#047857', labelBg: 'rgba(4,120,87,0.1)',
              desc: 'Identitas kamu sudah diverifikasi admin. Bisa galang dana langsung.',
              btnText: 'Kelola Verifikasi', btnHref: '/owner/profile', btnBg: C.forest,
            };
            if (kycStatus === 'pending_verification') return {
              Icon: Clock, label: 'MENUNGGU VERIFIKASI', labelColor: '#B45309', labelBg: 'rgba(180,83,9,0.1)',
              desc: 'Tim TeraLoka sedang meninjau dokumen kamu. Sambil menunggu, kamu sudah bisa galang dana.',
              btnText: 'Lihat Detail', btnHref: '/owner/profile', btnBg: '#B45309',
            };
            if (kycStatus === 'loading') return {
              Icon: Loader2, label: 'MEMUAT', labelColor: C.muted, labelBg: 'rgba(107,114,128,0.1)',
              desc: 'Sedang memuat status verifikasi...',
              btnText: 'Lihat Detail', btnHref: '/owner/profile', btnBg: C.faint,
            };
            return {
              Icon: ShieldAlert, label: 'BELUM LENGKAP', labelColor: '#B91C1C', labelBg: 'rgba(185,28,28,0.1)',
              desc: 'Lengkapi profil verifikasi untuk bisa galang dana donasi di TeraLoka.',
              btnText: 'Lengkapi Sekarang', btnHref: '/owner/profile/complete', btnBg: C.forest,
            };
          })();
          const StatusIcon = meta.Icon;
          return (
            <div style={{ ...cardBase, padding: 18, border: `1.5px solid ${meta.labelColor}26` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(27,107,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HeartHandshake size={19} color={C.forest} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Verifikasi Penggalang BADONASI</h2>
                  <p style={{ fontSize: 11.5, color: C.muted }}>Wajib untuk galang dana donasi</p>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.labelBg, padding: '5px 11px', borderRadius: 20, marginBottom: 10 }}>
                <StatusIcon size={13} color={meta.labelColor} style={kycStatus === 'loading' ? { animation: 'spin 0.8s linear infinite' } : undefined} />
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.labelColor, letterSpacing: '0.5px' }}>{meta.label}</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.5, marginBottom: 14 }}>{meta.desc}</p>
              <Link href={meta.btnHref} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '12px', borderRadius: 12, background: meta.btnBg, color: '#fff',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                boxShadow: `0 8px 20px -10px ${meta.btnBg}`,
              }}>
                {meta.btnText} <ArrowRight size={15} />
              </Link>
            </div>
          );
        })()}

        {/* Informasi Profil */}
        <div style={{ ...cardBase, padding: 22 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 800, color: C.ink, marginBottom: 18, letterSpacing: '-0.2px' }}>Informasi Profil</h2>

          {/* Nomor WhatsApp */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Nomor WhatsApp
            </label>

            {hasPhone ? (
              <>
                <div style={{
                  padding: '12px 14px', borderRadius: 12, background: '#F6F8F7', border: `1px solid ${C.line}`,
                  fontSize: 14, color: C.ink, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Phone size={16} color={C.forest} />
                  <span style={{ fontWeight: 600 }}>+{user.phone}</span>
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#047857', background: 'rgba(4,120,87,0.1)', padding: '3px 9px', borderRadius: 20 }}>
                    <ShieldCheck size={12} /> Terverifikasi
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: C.faint, marginTop: 6 }}>Nomor WA tidak bisa diubah — digunakan untuk login.</p>
              </>
            ) : phoneSaved ? (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(27,107,74,0.06)', border: `1px solid ${C.forest}33`, fontSize: 13.5, color: C.forest, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <Check size={16} /> Nomor tersimpan. Refresh untuk melihat perubahan.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', borderRadius: 12, border: `1.5px solid ${C.line}`, background: '#fff', transition: 'border 0.2s' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, height: 46, padding: '0 12px', borderRight: `1px solid ${C.line}`, fontSize: 14, fontWeight: 600, color: C.muted, background: '#F9FAFB' }}>
                    <Phone size={14} color={C.forest} /> +62
                  </span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePhone()}
                    placeholder="812 3456 7890"
                    style={{ flex: 1, height: 46, border: 'none', outline: 'none', padding: '0 14px', fontSize: 14, color: C.ink, background: 'transparent' }}
                  />
                </div>
                {phoneError && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{phoneError}</p>}
                <p style={{ fontSize: 11.5, color: C.faint, marginTop: 6, lineHeight: 1.5 }}>
                  Tambahkan nomor WhatsApp untuk notifikasi pesanan, koordinasi BALAJU, dan panggilan darurat (SOS).
                </p>
                <button
                  onClick={handleSavePhone}
                  disabled={savingPhone || phoneInput.length < 9}
                  style={{
                    marginTop: 10, width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    background: (savingPhone || phoneInput.length < 9) ? C.faint : C.forest,
                    color: '#fff', fontSize: 13.5, fontWeight: 700,
                    cursor: (savingPhone || phoneInput.length < 9) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: (savingPhone || phoneInput.length < 9) ? 'none' : `0 8px 20px -10px ${C.forest}`,
                    transition: 'all 0.2s',
                  }}
                >
                  {savingPhone ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Menyimpan...</> : <>Simpan Nomor</>}
                </button>
              </>
            )}
          </div>

          {/* Nama */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Nama Lengkap
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Masukkan nama lengkap kamu..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${saved ? C.forest : C.line}`, fontSize: 14, outline: 'none',
                transition: 'border 0.2s', boxSizing: 'border-box', color: C.ink,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.forest)}
              onBlur={(e) => (e.target.style.borderColor = saved ? C.forest : C.line)}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#EF4444', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || name.trim() === user.name}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: saved ? C.forest : (saving || !name.trim() || name.trim() === user.name) ? C.faint : C.forest,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: (saving || !name.trim() || name.trim() === user.name) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: (saving || !name.trim() || name.trim() === user.name) ? 'none' : `0 8px 20px -10px ${C.forest}`,
              transition: 'all 0.2s',
            }}
          >
            {saved ? <><Check size={16} /> Tersimpan!</> : saving ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Menyimpan...</> : 'Simpan Nama'}
          </button>
        </div>

        {/* Akses Cepat Admin */}
        {(user.role === 'super_admin' || user.role.startsWith('admin')) && (
          <div style={{ ...cardBase, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={15} color={C.amber} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Akses Cepat Admin</h2>
            </div>
            <div style={{ padding: 8 }}>
              {[
                { href: '/admin', label: 'Admin Dashboard', Icon: LayoutDashboard },
                { href: '/admin/users', label: 'Manajemen Users', Icon: Users },
                { href: '/admin/listings', label: 'Manajemen Listing', Icon: Home },
                { href: '/office/newsroom/bakabar/hub', label: 'Manajemen Konten', Icon: Newspaper },
              ].map(({ href, label, Icon }) => (
                <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F6F8F7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <Icon size={17} color={C.muted} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
                  <ArrowRight size={15} color="#D1D5DB" style={{ marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Portal Owner */}
        {user.role === 'owner_listing' && (
          <div style={{ ...cardBase, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Home size={15} color={C.toska} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Portal Owner</h2>
            </div>
            <div style={{ padding: 8 }}>
              {[
                { href: '/owner', label: 'Dashboard Owner', Icon: LayoutDashboard },
                { href: '/owner/listing/new/kos', label: 'Tambah Listing Kos', Icon: Plus },
              ].map(({ href, label, Icon }) => (
                <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F6F8F7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <Icon size={17} color={C.muted} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
                  <ArrowRight size={15} color="#D1D5DB" style={{ marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Aktivitas Saya */}
        {(user.role === 'service_user' || user.role === 'owner_listing' || user.role.startsWith('admin') || user.role === 'super_admin' || user.role.startsWith('operator')) && (
          <div style={{ ...cardBase, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={15} color={C.forest} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Aktivitas Saya</h2>
            </div>
            <div style={{ padding: 8 }}>
              {user.role === 'service_user' && (
                <Link href="/my-reports" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F6F8F7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <ClipboardList size={17} color={C.muted} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Laporan BALAPOR Saya</div>
                    <div style={{ fontSize: 11, color: C.faint }}>Pantau status laporan warga kamu</div>
                  </div>
                  <ArrowRight size={15} color="#D1D5DB" />
                </Link>
              )}
              <Link href="/my-donations" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F6F8F7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <HeartHandshake size={17} color={C.muted} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Donasi Saya</div>
                  <div style={{ fontSize: 11, color: C.faint }}>Riwayat donasi BADONASI kamu</div>
                </div>
                <ArrowRight size={15} color="#D1D5DB" />
              </Link>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '13px', borderRadius: 14, border: '1px solid #FEE2E2',
            background: 'rgba(239,68,68,0.04)', color: '#EF4444', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
        >
          <LogOut size={16} /> Keluar dari TeraLoka
        </button>
      </div>
    </div>
  );
}
