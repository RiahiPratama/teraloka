'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Shield, User, Edit3, CheckCircle2, Clock,
  AlertCircle, Phone, Calendar, IdCard, EyeOff, Loader2,
  ExternalLink, Wifi, WifiOff, MapPin,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// /owner/profile/page.tsx
//
// Profile saya — tab-based untuk extensibility.
// Tab 1: Verifikasi Penggalang (KYC status)
// Tab 2: Akun (basic info: nama, phone, role, member since)
// Future: Tab 3 Notifikasi, Tab 4 Keamanan, dll.
// ═══════════════════════════════════════════════════════════════

interface CreatorProfile {
  id: string;
  phone: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string | null;
  creator_full_name: string | null;
  creator_id_documents: string[] | null;
  creator_verified: boolean;
  creator_verified_at: string | null;
}

type TabKey = 'verifikasi' | 'akun' | 'status';
type CreatorStatus = 'incomplete' | 'pending_verification' | 'verified';

export default function OwnerProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, token } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [status, setStatus] = useState<CreatorStatus>('incomplete');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('verifikasi');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/owner/profile');
    }
  }, [authLoading, user, router]);

  // Fetch profile
  useEffect(() => {
    if (!user || !token) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/me/creator-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error('Gagal ambil data profil');
        const json = await res.json();
        setProfile(json.data.profile);
        setStatus(json.data.status);
      } catch (err: any) {
        setError(err.message ?? 'Gagal memuat profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, token]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#003526]" size={36} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white p-4">
        <div className="max-w-lg mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 mt-8">
          <p className="text-red-700 text-sm">{error ?? 'Profil tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#003526] to-[#004d36] text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <Link
            href="/owner"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <h1 className="text-2xl font-extrabold">Profil Saya</h1>
          <p className="text-white/70 text-sm mt-1">
            Kelola data verifikasi dan informasi akun kamu
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 grid grid-cols-3 gap-1">
          <TabButton
            active={activeTab === 'verifikasi'}
            onClick={() => setActiveTab('verifikasi')}
            icon={Shield}
            label="Verifikasi"
            badge={status === 'incomplete' ? 'red' : status === 'pending_verification' ? 'amber' : 'emerald'}
          />
          <TabButton
            active={activeTab === 'akun'}
            onClick={() => setActiveTab('akun')}
            icon={User}
            label="Akun"
          />
          <TabButton
            active={activeTab === 'status'}
            onClick={() => setActiveTab('status')}
            icon={Wifi}
            label="Status"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        {activeTab === 'verifikasi' && (
          <VerifikasiTab profile={profile} status={status} />
        )}
        {activeTab === 'akun' && (
          <AkunTab profile={profile} />
        )}
        {activeTab === 'status' && token && (
          <StatusTab token={token} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function TabButton({
  active, onClick, icon: Icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  badge?: 'red' | 'amber' | 'emerald';
}) {
  const badgeColor =
    badge === 'red' ? 'bg-red-500'
    : badge === 'amber' ? 'bg-amber-500'
    : badge === 'emerald' ? 'bg-emerald-500'
    : '';

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
        active
          ? 'bg-[#003526] text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={15} />
      {label}
      {badge && (
        <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${badgeColor}`} />
      )}
    </button>
  );
}

function VerifikasiTab({ profile, status }: { profile: CreatorProfile; status: CreatorStatus }) {
  const isComplete = !!(profile.creator_full_name && profile.creator_id_documents?.length);

  // Status meta
  const meta = (() => {
    if (status === 'verified') return {
      label: 'TERVERIFIKASI',
      color: '#047857',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      tagline: 'Identitas kamu sudah diverifikasi admin TeraLoka. Kamu bisa galang dana tanpa batas.',
    };
    if (status === 'pending_verification') return {
      label: 'MENUNGGU VERIFIKASI',
      color: '#B45309',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: Clock,
      tagline: 'Tim TeraLoka sedang meninjau dokumen kamu. Sambil menunggu, kamu sudah bisa mulai galang dana.',
    };
    return {
      label: 'BELUM LENGKAP',
      color: '#B91C1C',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertCircle,
      tagline: 'Lengkapi profil verifikasi kamu untuk bisa membuat kampanye donasi.',
    };
  })();

  const StatusIcon = meta.icon;

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`${meta.bg} ${meta.border} border rounded-2xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <StatusIcon size={18} style={{ color: meta.color }} strokeWidth={2.5} />
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: meta.color }}>
          {meta.tagline}
        </p>
      </div>

      {/* Profile data */}
      {isComplete ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Data Verifikasi
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Nama lengkap */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <IdCard size={11} />
                Nama Lengkap (sesuai KTP)
              </p>
              <p className="text-sm font-bold text-gray-900">
                {profile.creator_full_name}
              </p>
            </div>

            {/* Dokumen identitas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Shield size={11} />
                  Dokumen Identitas ({profile.creator_id_documents?.length ?? 0})
                </p>
                <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  <EyeOff size={9} />
                  Rahasia
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Hanya kamu dan admin TeraLoka yang bisa lihat. Tidak ditampilkan ke donor publik.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {profile.creator_id_documents?.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-gray-50 hover:ring-2 hover:ring-[#003526] transition-all border border-gray-100"
                  >
                    <img src={url} alt={`KTP ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>

            {/* Verified info */}
            {status === 'verified' && profile.creator_verified_at && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-500">
                  Diverifikasi pada {new Date(profile.creator_verified_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Edit button */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
            <Link
              href="/owner/profile/complete"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#003526] hover:bg-[#004d36] text-white text-sm font-bold transition-colors"
            >
              <Edit3 size={14} />
              Edit Profil Verifikasi
            </Link>
            {status === 'verified' && (
              <p className="text-[10px] text-amber-700 mt-2 text-center">
                ⚠️ Edit akan reset status verifikasi
              </p>
            )}
          </div>
        </div>
      ) : (
        // Empty state
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Shield size={24} className="text-red-500" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Profil Verifikasi Belum Lengkap
          </p>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Upload KTP/identitas + nama lengkap kamu untuk mulai bisa galang dana di TeraLoka.
          </p>
          <Link
            href="/owner/profile/complete"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003526] hover:bg-[#004d36] text-white text-sm font-bold transition-colors"
          >
            <Edit3 size={14} />
            Lengkapi Sekarang
          </Link>
        </div>
      )}

      {/* Privacy reassurance */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
        <p className="text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
          <Shield size={12} className="text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong className="font-bold">Privasi terjaga:</strong> Data identitas kamu disimpan terenkripsi, hanya diakses admin TeraLoka untuk verifikasi, dan tidak akan dibagikan ke pihak manapun di luar TeraLoka.
          </span>
        </p>
      </div>
    </div>
  );
}

function AkunTab({ profile }: { profile: CreatorProfile }) {
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const items = [
    {
      icon: User,
      label: 'Nama Tampilan',
      value: profile.name ?? 'Belum diisi',
      sublabel: 'Nama informal di UI',
    },
    {
      icon: Phone,
      label: 'Nomor WhatsApp',
      value: formatPhone(profile.phone),
      sublabel: 'Verified via OTP',
    },
    {
      icon: Shield,
      label: 'Role',
      value: roleLabel(profile.role),
      sublabel: 'Tipe akun di TeraLoka',
    },
    {
      icon: Calendar,
      label: 'Member Sejak',
      value: memberSince,
      sublabel: 'Tanggal akun dibuat',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Avatar + Name card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#003526] to-[#0891B2] flex items-center justify-center text-white text-2xl font-bold mb-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            (profile.name?.[0] ?? profile.phone?.[3] ?? 'U').toUpperCase()
          )}
        </div>
        <p className="text-base font-extrabold text-gray-900">
          {profile.name ?? 'User TeraLoka'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatPhone(profile.phone)}
        </p>
      </div>

      {/* Info list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Informasi Akun
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.label} className="px-5 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#003526]/5 flex items-center justify-center shrink-0 mt-0.5">
                  <ItemIcon size={14} className="text-[#003526]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {item.value}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {item.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint about Verifikasi tab */}
      <Link
        href="#"
        onClick={(e) => { e.preventDefault(); }}
        className="block bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4"
      >
        <p className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
          <ExternalLink size={12} className="text-gray-500 shrink-0 mt-0.5" />
          <span>
            Untuk mulai galang dana, lengkapi <strong className="font-bold">Profil Verifikasi</strong> kamu di tab sebelah.
          </span>
        </p>
      </Link>
    </div>
  );
}

// Helpers
function formatPhone(phone: string): string {
  // 6281234567890 → +62 812-3456-7890
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) {
    return `+62 ${clean.slice(2, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    user: 'Pengguna',
    admin_content: 'Admin Konten',
    admin_funding: 'Admin BADONASI',
    super_admin: 'Super Admin',
  };
  return map[role] ?? role;
}

// ═══════════════════════════════════════════════════════════════
// StatusTab — Offline Mode toggle (FIX-G-B3)
//
// Filosofi: Penggalang Maluku Utara kadang offline (sinyal, sakit, traveling).
// Kampanye TETAP terima donasi. Yang adjust: verification responsibility.
// Saat offline > 3 hari, admin TeraLoka jadi backup verifier.
// ═══════════════════════════════════════════════════════════════

interface OfflineStatus {
  is_offline_mode: boolean;
  offline_mode_set_at: string | null;
  offline_mode_until: string | null;
}

function StatusTab({ token }: { token: string }) {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [untilDate, setUntilDate] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/funding/my/profile/offline-mode`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.success) setStatus(json.data);
      } catch {
        setErr('Gagal memuat status');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [token]);

  async function toggleOfflineMode(enable: boolean) {
    setUpdating(true);
    setErr(null);
    try {
      const body: any = { enable };
      if (enable && untilDate) body.until_date = untilDate;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/funding/my/profile/offline-mode`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (json.success) {
        // Re-fetch full status
        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/funding/my/profile/offline-mode`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) setStatus(refreshJson.data);
        setShowConfirm(false);
        setUntilDate('');
      } else {
        setErr(json.error?.message ?? 'Gagal update status');
      }
    } catch {
      setErr('Koneksi bermasalah. Coba lagi.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Loader2 size={24} className="animate-spin text-[#003526] mx-auto" />
      </div>
    );
  }

  const isOffline = status?.is_offline_mode ?? false;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div
        className={`rounded-2xl border p-5 ${
          isOffline
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          {isOffline ? (
            <WifiOff size={24} className="text-amber-700" strokeWidth={2.2} />
          ) : (
            <Wifi size={24} className="text-emerald-700" strokeWidth={2.2} />
          )}
          <div>
            <p
              className={`text-xs font-extrabold uppercase tracking-wider ${
                isOffline ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {isOffline ? 'OFFLINE SEMENTARA' : 'ONLINE'}
            </p>
            <p
              className={`text-base font-bold ${
                isOffline ? 'text-amber-900' : 'text-emerald-900'
              }`}
            >
              {isOffline ? 'Penggalang sedang tidak aktif' : 'Penggalang aktif'}
            </p>
          </div>
        </div>

        <p
          className={`text-sm leading-relaxed ${
            isOffline ? 'text-amber-800' : 'text-emerald-800'
          }`}
        >
          {isOffline
            ? 'Kampanye tetap terima donasi. Penerima donasi menunggu kabar baik dari kamu — segera aktifkan online begitu sinyal kembali.'
            : 'Kamu siap menerima dan verifikasi donasi seperti biasa. Setiap aktivitas kamu membantu donasi cepat sampai ke yang membutuhkan.'}
        </p>

        {/* Show offline meta if active */}
        {isOffline && status?.offline_mode_set_at && (
          <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-bold text-amber-700 uppercase tracking-wider mb-1">
                Sejak
              </p>
              <p className="text-amber-900">
                {new Date(status.offline_mode_set_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="font-bold text-amber-700 uppercase tracking-wider mb-1">
                Sampai
              </p>
              <p className="text-amber-900">
                {status.offline_mode_until
                  ? new Date(status.offline_mode_until).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '— (manual)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toggle button */}
      {!showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={updating}
          className={`w-full rounded-2xl py-3.5 px-4 text-sm font-bold transition-all shadow-sm ${
            isOffline
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          } disabled:opacity-50`}
        >
          {isOffline ? 'Aktifkan Lagi (Online)' : 'Set Mode Offline Darurat'}
        </button>
      )}

      {/* Confirmation modal-style card */}
      {showConfirm && (
        <div className="bg-white border-2 border-[#003526] rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              {isOffline ? 'Aktifkan Penggalang Online?' : 'Set Mode Offline Darurat?'}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {isOffline
                ? 'Kamu akan kembali aktif dan handle verifikasi donasi sendiri. Penerima donasi pasti senang!'
                : 'Mode ini untuk darurat (sinyal hilang, sakit, traveling penting). Penerima donasi kamu menunggu kabar baik — pastikan online lagi sesegera mungkin.'}
            </p>
          </div>

          {!isOffline && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar size={11} />
                Sampai Tanggal (opsional)
              </label>
              <input
                type="date"
                value={untilDate}
                onChange={e => setUntilDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#003526]"
              />
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                Kosongkan kalau ga tau kapan online lagi. Bisa aktivasi manual kapan saja.
              </p>
            </div>
          )}

          {err && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">{err}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowConfirm(false);
                setUntilDate('');
                setErr(null);
              }}
              disabled={updating}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={() => toggleOfflineMode(!isOffline)}
              disabled={updating}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 ${
                isOffline ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin mx-auto" />
              ) : isOffline ? 'Ya, Aktifkan' : 'Ya, Set Offline'}
            </button>
          </div>
        </div>
      )}

      {/* Info card — purpose-driven, empathy-first */}
      <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4">
        {/* Hero message — connect to purpose */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">💚</div>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-emerald-900 leading-snug mb-1">
                Aktifnya Anda Sangat Membantu Penerima Donasi
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Setiap verifikasi cepat dari kamu = bantuan lebih cepat sampai ke yang membutuhkan. Kepercayaan donor pun terjaga.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Kapan pakai mode offline */}
        <div className="border-t border-gray-100 pt-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-2.5">
            <AlertCircle size={12} className="text-amber-700" />
            Kapan Mode Offline Tepat Digunakan
          </h3>
          <ul className="space-y-1.5 text-[11px] text-gray-700 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5 shrink-0">•</span>
              <span>Berada di pulau terpencil tanpa sinyal internet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5 shrink-0">•</span>
              <span>Sakit yang menghambat akses HP / laptop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5 shrink-0">•</span>
              <span>Urusan keluarga mendadak (duka, dll)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5 shrink-0">•</span>
              <span>Perjalanan dinas yang tidak bisa ditunda</span>
            </li>
          </ul>
        </div>

        {/* Section 2: Cara kerja saat offline */}
        <div className="border-t border-gray-100 pt-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-2.5">
            <MapPin size={12} className="text-[#003526]" />
            Cara Kerja Saat Offline
          </h3>
          <ul className="space-y-1.5 text-[11px] text-gray-700 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
              <span>Kampanye tetap aktif menerima donasi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
              <span>Donor melihat banner pemberitahuan di public page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
              <span>Donasi tertunda lebih dari 3 hari di-flag untuk review tim TeraLoka</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
              <span>Aktifkan kembali kapan saja begitu sinyal/kondisi membaik</span>
            </li>
          </ul>
        </div>

        {/* Closing — gentle reminder */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mt-1">
          <p className="text-[11px] text-blue-900 leading-relaxed">
            🤝 <strong>Mari jaga kepercayaan bersama.</strong> Donor mempercayakan dananya, penerima menanti bantuan — peran kamu sebagai penggalang sangat berarti untuk seluruh ekosistem BADONASI.
          </p>
        </div>
      </div>
    </div>
  );
}
