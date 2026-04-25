'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Shield, IdCard, AlertCircle, Loader2,
  CheckCircle2, EyeOff, Lock,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// /owner/profile/complete/page.tsx
//
// Form lengkapi profil verifikasi (KYC penggalang).
// User upload KTP/KK/Akta + isi nama lengkap sesuai dokumen.
// 
// Privacy contract:
// - Data hanya untuk admin TeraLoka (verifikasi)
// - Tidak ditampilkan ke donor publik
// - Disimpan di bucket "kyc" (private bucket)
//
// On submit success:
// - Redirect ke ?return URL kalau ada (auto-resume flow galang dana)
// - Atau ke /owner/profile (default)
// ═══════════════════════════════════════════════════════════════

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#003526]" size={36} />
      </div>
    }>
      <ProfileCompletePageInner />
    </Suspense>
  );
}

function ProfileCompletePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return');
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();

  // Form state
  const [fullName, setFullName] = useState('');
  const [idDocs, setIdDocs] = useState<string[]>([]);
  const [agreeChecked, setAgreeChecked] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    docs?: string;
    agree?: string;
  }>({});

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const redirectTarget = returnUrl
        ? `/owner/profile/complete?return=${encodeURIComponent(returnUrl)}`
        : '/owner/profile/complete';
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [authLoading, isAuthenticated, router, returnUrl]);

  // Pre-fill from existing profile (if user editing)
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/me/creator-profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const json = await res.json();
          const p = json.data.profile;
          setFullName(p.creator_full_name ?? '');
          setIdDocs(p.creator_id_documents ?? []);
        }
      } catch {
        // Silent — user can fill from scratch
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, token]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    const trimmed = fullName.trim();
    if (trimmed.length < 3) errors.fullName = 'Nama lengkap minimal 3 karakter';
    else if (trimmed.length > 100) errors.fullName = 'Nama lengkap maksimal 100 karakter';

    if (idDocs.length < 1) errors.docs = 'Upload minimal 1 dokumen identitas';
    else if (idDocs.length > 3) errors.docs = 'Maksimal 3 dokumen';

    if (!agreeChecked) errors.agree = 'Centang persetujuan dulu sebelum lanjut';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/me/creator-profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            creator_full_name: fullName.trim(),
            creator_id_documents: idDocs,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Gagal simpan profil');
      }

      // Success → redirect
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace('/owner/profile?saved=1');
      }
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan');
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#003526]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003526]/5 to-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#003526] to-[#004d36] text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <Link
            href={returnUrl ?? '/owner/profile'}
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <h1 className="text-2xl font-extrabold">Lengkapi Profil Verifikasi</h1>
          <p className="text-white/70 text-sm mt-1">
            Wajib diisi sebelum bisa galang dana di TeraLoka
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10 space-y-4">
        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-wider">
                🔒 Data Pribadi & Rahasia
              </p>
              <p className="text-xs text-blue-900 leading-relaxed">
                Data identitas kamu <strong className="font-bold">hanya bisa dilihat oleh admin TeraLoka</strong> untuk verifikasi. <strong className="font-bold">Tidak ditampilkan ke donor publik.</strong> Kami patuh pada UU PDP (Pelindungan Data Pribadi) Indonesia.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Section 1: Foto KTP */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <IdCard size={14} className="text-[#003526]" />
                Foto KTP / Identitas
              </label>
              <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <EyeOff size={9} />
                Rahasia
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Upload <strong>1-3 dokumen</strong>: KTP (utama), atau KK / Akta Kelahiran. Foto harus jelas, tidak buram, dan terbaca.
            </p>

            <ImageUpload
              bucket="kyc"
              label=""
              maxFiles={3}
              maxSizeMB={5}
              onUpload={(urls: string[]) => {
                setIdDocs(urls);
                if (urls.length >= 1) setFieldErrors(p => ({ ...p, docs: undefined }));
              }}
              existingUrls={idDocs}
            />

            {idDocs.length > 0 && !fieldErrors.docs && (
              <p className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={12} />
                {idDocs.length} dokumen tersimpan (rahasia)
              </p>
            )}

            {fieldErrors.docs && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {fieldErrors.docs}
              </p>
            )}
          </div>

          {/* Section 2: Nama Lengkap */}
          <div className="p-5 border-b border-gray-100">
            <label className="text-sm font-bold text-gray-900 mb-2 block">
              Nama Lengkap (sesuai KTP)
            </label>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              Tulis sesuai yang tertera di KTP / dokumen identitas kamu.
            </p>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (e.target.value.trim().length >= 3) {
                  setFieldErrors(p => ({ ...p, fullName: undefined }));
                }
              }}
              placeholder="Contoh: Riahi Pratama Siregar"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.fullName
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-[#003526]/20 focus:border-[#003526]'
              }`}
              maxLength={100}
            />
            <div className="flex items-center justify-between mt-1.5">
              {fieldErrors.fullName ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {fieldErrors.fullName}
                </p>
              ) : <span />}
              <p className="text-[10px] text-gray-400">
                {fullName.length}/100
              </p>
            </div>
          </div>

          {/* Section 3: Tanggung Jawab */}
          <div className="p-5">
            <label className={`flex items-start gap-2.5 cursor-pointer ${fieldErrors.agree ? 'text-red-600' : ''}`}>
              <input
                type="checkbox"
                checked={agreeChecked}
                onChange={(e) => {
                  setAgreeChecked(e.target.checked);
                  if (e.target.checked) {
                    setFieldErrors(p => ({ ...p, agree: undefined }));
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#003526] focus:ring-[#003526]/20"
              />
              <span className={`text-xs leading-relaxed ${fieldErrors.agree ? 'text-red-700' : 'text-gray-700'}`}>
                Saya menyatakan bahwa <strong className="font-bold">data identitas yang saya upload adalah ASLI dan benar milik saya sendiri</strong>. Saya bersedia bertanggung jawab secara hukum jika ditemukan pemalsuan atau penyalahgunaan identitas.
              </span>
            </label>
            {fieldErrors.agree && (
              <p className="mt-2 ml-6 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={11} />
                {fieldErrors.agree}
              </p>
            )}
          </div>
        </div>

        {/* Verify reset notice */}
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3">
          <p className="text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Setiap kali kamu update data verifikasi, status akan reset ke <strong className="font-bold">Menunggu Verifikasi</strong>. Admin akan review ulang dokumen kamu.
            </span>
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-[#003526] hover:bg-[#004d36] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Simpan & Lanjutkan
            </>
          )}
        </button>

        {/* Cancel button */}
        <Link
          href={returnUrl ?? '/owner/profile'}
          className="block text-center text-xs text-gray-500 hover:text-gray-700 py-2"
        >
          Batalkan
        </Link>
      </div>
    </div>
  );
}
