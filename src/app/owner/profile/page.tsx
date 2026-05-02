'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/profile/page.tsx
// Profile penggalang — display + edit single page
//
// Backend endpoints:
//   GET  /me/creator-profile — fetch current profile + KYC status
//   PATCH /me/creator-profile — update KTP + nama lengkap
//   PATCH /auth/profile — update nama dasar
//
// Status flow:
//   incomplete → pending_verification → verified
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Loader2, AlertCircle, ShieldCheck, ShieldAlert,
  User, Phone, Edit3, Save, X, Camera, FileText,
  CheckCircle2, Hourglass, AlertTriangle, LogOut,
  HeartHandshake, Plus, ChevronRight, Trophy,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

type CreatorStatus = 'incomplete' | 'pending_verification' | 'verified';

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

interface ProfileData {
  profile: CreatorProfile;
  status: CreatorStatus;
  is_complete: boolean;
}

interface CampaignStats {
  total_campaigns: number;
  total_active: number;
  total_collected: number;
  total_donor_count: number;
}

const STATUS_META: Record<CreatorStatus, { label: string; color: string; bg: string; icon: any; desc: string }> = {
  incomplete: {
    label: 'Belum Lengkap',
    color: '#B45309',
    bg: '#FEF3C7',
    icon: AlertTriangle,
    desc: 'Lengkapi KTP & nama lengkap untuk mulai galang dana',
  },
  pending_verification: {
    label: 'Menunggu Verifikasi',
    color: '#1E40AF',
    bg: '#DBEAFE',
    icon: Hourglass,
    desc: 'Tim TeraLoka sedang review dokumen kamu (1-2 hari kerja)',
  },
  verified: {
    label: 'Terverifikasi ✓',
    color: '#047857',
    bg: '#D1FAE5',
    icon: ShieldCheck,
    desc: 'Akun kamu sudah terverifikasi dan bisa galang dana',
  },
};

export default function OwnerProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit modes
  const [editingName, setEditingName] = useState(false);
  const [editingKyc, setEditingKyc] = useState(false);

  // Form state
  const [nameInput, setNameInput] = useState('');
  const [creatorFullName, setCreatorFullName] = useState('');
  const [idDocs, setIdDocs] = useState<string[]>([]);
  const [kycSignedUrls, setKycSignedUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    load();
  }, [authLoading, user, router]);

  async function load() {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch(`${API}/me/creator-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/funding/my/financial-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (profileRes.success) {
        setData(profileRes.data);
        setNameInput(profileRes.data.profile.name ?? '');
        setCreatorFullName(profileRes.data.profile.creator_full_name ?? '');
        setIdDocs(profileRes.data.profile.creator_id_documents ?? []);
        setKycSignedUrls(profileRes.data.kyc_signed_urls ?? []);
      } else {
        toast.error(profileRes?.error?.message || 'Gagal load profil');
      }

      if (statsRes.success && statsRes.data) {
        setStats({
          total_campaigns:    statsRes.data.total_campaigns ?? 0,
          total_active:       statsRes.data.total_active ?? 0,
          total_collected:    statsRes.data.total_collected ?? 0,
          total_donor_count:  statsRes.data.total_donor_count ?? 0,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    if (!nameInput.trim() || nameInput.trim().length < 2) {
      toast.warning('Nama minimal 2 karakter');
      return;
    }
    setSaving(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal update');
      }
      toast.success('Nama berhasil diperbarui');
      setEditingName(false);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveKyc() {
    if (!creatorFullName.trim() || creatorFullName.trim().length < 3) {
      toast.warning('Nama lengkap minimal 3 karakter');
      return;
    }
    if (idDocs.length < 1) {
      toast.warning('Upload minimal 1 dokumen identitas');
      return;
    }
    setSaving(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/me/creator-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          creator_full_name: creatorFullName.trim(),
          creator_id_documents: idDocs,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal update KYC');
      }
      toast.success('Dokumen berhasil dikirim, menunggu verifikasi admin');
      setEditingKyc(false);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEditName() {
    setNameInput(data?.profile.name ?? '');
    setEditingName(false);
  }

  function cancelEditKyc() {
    setCreatorFullName(data?.profile.creator_full_name ?? '');
    setIdDocs(data?.profile.creator_id_documents ?? []);
    setEditingKyc(false);
  }

  async function handleLogout() {
    if (!confirm('Keluar dari akun TeraLoka?')) return;
    try {
      await logout();
      toast.success('Berhasil logout');
      router.push('/');
    } catch (err: any) {
      toast.error('Gagal logout');
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">Gagal load profil</p>
          <button onClick={load} className="text-sm text-[#003526] underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  const { profile, status } = data;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/owner" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900 flex-1">Profil Saya</h1>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Avatar + identitas dasar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-4 mb-4">
            <AvatarUpload
              currentUrl={profile.avatar_url}
              onUpload={() => load()}
              userId={profile.id}
              token={localStorage.getItem(TOKEN_KEY) ?? ''}
            />
            <div className="flex-1 min-w-0 pt-1">
              {editingName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Nama panggilan"
                    maxLength={50}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-[#003526]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveName}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#003526] text-white py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Simpan
                    </button>
                    <button
                      onClick={cancelEditName}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold border border-gray-200 text-gray-700 py-1.5 rounded-lg"
                    >
                      <X size={12} />
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-black text-gray-900 truncate">
                      {profile.name || 'Belum diisi'}
                    </h2>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded hover:bg-gray-100"
                      aria-label="Edit nama"
                    >
                      <Edit3 size={12} className="text-gray-500" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                    <Phone size={11} />
                    {profile.phone}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{ backgroundColor: meta.bg }}
          >
            <StatusIcon size={18} style={{ color: meta.color }} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-0.5" style={{ color: meta.color }}>
                {meta.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: meta.color, opacity: 0.85 }}>
                {meta.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Stats card */}
        {stats && stats.total_campaigns > 0 && (
          <div className="bg-gradient-to-br from-[#003526] to-[#0d4d3a] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="opacity-80" />
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Track Record Penggalang</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-black">{stats.total_campaigns}</p>
                <p className="text-xs opacity-80">Kampanye Dibuat</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.total_active}</p>
                <p className="text-xs opacity-80">Sedang Aktif</p>
              </div>
              <div className="col-span-2 pt-3 border-t border-white/20">
                <p className="text-xl font-black">{formatRupiah(stats.total_collected)}</p>
                <p className="text-xs opacity-80">
                  Total Terkumpul · dari {stats.total_donor_count} donatur
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KYC section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#003526]" />
              <h2 className="text-sm font-bold text-gray-800">Verifikasi Identitas (KYC)</h2>
            </div>
            {!editingKyc && (
              <button
                onClick={() => setEditingKyc(true)}
                className="text-xs font-bold text-[#003526] hover:underline"
              >
                {data.is_complete ? 'Edit' : 'Lengkapi'}
              </button>
            )}
          </div>

          {editingKyc ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldAlert size={14} className="text-blue-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Update data akan reset status verifikasi. Admin akan review ulang (1-2 hari kerja).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Nama Lengkap (sesuai KTP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={creatorFullName}
                  onChange={e => setCreatorFullName(e.target.value)}
                  placeholder="Nama lengkap sesuai dokumen identitas"
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Dokumen Identitas (KTP / KK / Akta) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload 1-3 file. Bisa KTP, Kartu Keluarga, atau Akta Lahir.
                </p>
                <ImageUpload
                  bucket="kyc"
                  label=""
                  maxFiles={3}
                  maxSizeMB={5}
                  onUpload={(urls: string[]) => setIdDocs(urls)}
                  existingUrls={idDocs}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveKyc}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save size={14} /> Kirim untuk Verifikasi</>
                  )}
                </button>
                <button
                  onClick={cancelEditKyc}
                  disabled={saving}
                  className="px-5 inline-flex items-center justify-center text-sm font-bold border border-gray-200 text-gray-700 rounded-xl"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <>
              {!data.is_complete ? (
                <div className="text-center py-4">
                  <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Belum ada dokumen</p>
                  <p className="text-xs text-gray-500 mb-3 max-w-xs mx-auto">
                    Untuk galang dana, kamu wajib upload dokumen identitas.
                  </p>
                  <button
                    onClick={() => setEditingKyc(true)}
                    className="inline-flex items-center gap-1.5 bg-[#003526] hover:bg-[#0d4d3a] text-white text-xs font-bold py-2 px-4 rounded-lg"
                  >
                    <Plus size={12} />
                    Lengkapi Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow
                    label="Nama Lengkap"
                    value={profile.creator_full_name ?? '—'}
                  />
                  <InfoRow
                    label="Dokumen"
                    value={`${profile.creator_id_documents?.length ?? 0} file`}
                  />
                  {profile.creator_verified_at && (
                    <InfoRow
                      label="Diverifikasi"
                      value={new Date(profile.creator_verified_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    />
                  )}

                  {/* ⭐ Issue 5: KYC bucket private — pakai signed URLs dari backend */}
                  {kycSignedUrls && kycSignedUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {kycSignedUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg border border-gray-200 overflow-hidden hover:opacity-80 bg-gray-50"
                        >
                          <img src={url} alt={`Dokumen ${i+1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Link
            href="/"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                <span className="text-base">🏠</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Beranda TeraLoka</p>
                <p className="text-xs text-gray-500">Kembali ke halaman utama</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
          <Link
            href="/owner"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#003526]/10 flex items-center justify-center">
                <HeartHandshake size={16} className="text-[#003526]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Kampanye Saya</p>
                <p className="text-xs text-gray-500">Kelola semua kampanye galang dana</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
          <Link
            href="/profile/donations"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#BE185D]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#BE185D]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Riwayat Donasi</p>
                <p className="text-xs text-gray-500">Donasi yang pernah kamu beri</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
        </div>

        {/* Logout button (alternative for users who don't see header icon) */}
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 py-3 rounded-xl"
        >
          <LogOut size={14} />
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-xs text-gray-500 flex-shrink-0">{label}</p>
      <p className="text-sm font-bold text-gray-800 text-right truncate">{value}</p>
    </div>
  );
}

function AvatarUpload({
  currentUrl,
  onUpload,
  userId,
  token,
}: {
  currentUrl: string | null;
  onUpload: () => void;
  userId: string;
  token: string;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function persistAvatar(url: string | null) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: url }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal simpan avatar');
      }
      toast.success(url ? 'Avatar berhasil diupdate' : 'Avatar dihapus');
      setEditing(false);
      onUpload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#003526] to-[#0d4d3a] flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
        {currentUrl ? (
          <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={28} className="text-white/80" />
        )}
      </div>
      <button
        onClick={() => setEditing(!editing)}
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#003526] text-white flex items-center justify-center shadow-md hover:bg-[#0d4d3a] transition-colors"
        aria-label="Ubah avatar"
      >
        <Camera size={11} />
      </button>

      {editing && (
        <div className="absolute top-20 left-0 z-20 bg-white rounded-xl border border-gray-200 shadow-xl p-3 min-w-[260px]">
          <p className="text-xs font-bold text-gray-700 mb-2">Foto Profile</p>
          <ImageUpload
            bucket="avatars"
            label=""
            maxFiles={1}
            maxSizeMB={1}
            onUpload={(urls: string[]) => {
              const url = urls[0];
              if (url) persistAvatar(url);
            }}
            existingUrls={currentUrl ? [currentUrl] : []}
          />
          <div className="flex gap-2 mt-2">
            {currentUrl && (
              <button
                onClick={() => persistAvatar(null)}
                disabled={saving}
                className="flex-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 disabled:opacity-50"
              >
                Hapus Avatar
              </button>
            )}
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
