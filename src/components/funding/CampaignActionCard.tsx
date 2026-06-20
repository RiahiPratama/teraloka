'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CampaignActionCard — action island GATED (persetujuan + createMyDraft).
//
// Di-extract dari /owner/funding/campaigns/new/info (S2). Dipakai sbg
// children <CampaignInfoContent>, di route OWNER (authed) & PUBLIK galang-dana.
//
// 🛡️ 3 ADAPTASI biar aman di route publik (bisa anon):
//   #1 Loading guard COMPACT (card kecil di slot aksi), BUKAN min-h-screen
//      full-page — biar info section (CampaignInfoContent) GAK ke-blank buat
//      anon/crawler.
//   #2 Gate loader = authLoading || (user && kycChecking) || (user && kycComplete===false).
//      Anon (no user) TIDAK ke-block walau kycChecking awalnya true.
//   #3 URL return/redirect → route publik baru (galang-dana), bukan /owner lama.
//
// Mapping yg dijaga:
//   anon                       → tombol "Login & Lanjut" (NOL redirect)
//   login + KYC belum lengkap  → redirect /owner/profile/complete
//   login + KYC lengkap        → "Saya Siap" → createMyDraft → /[id]/edit
// ═══════════════════════════════════════════════════════════════

// [S2] return path = route publik baru (owner lama 308 → sini).
const RETURN_PATH = '/fundraising/badonasi/galang-dana';

export default function CampaignActionCard() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  // ⭐ FIX-E: KYC profile state
  const [kycChecking, setKycChecking] = useState(true);
  const [kycComplete, setKycComplete] = useState<boolean | null>(null);

  // ⭐ FIX-E: Pre-check creator profile on mount
  // Auto-redirect kalau profile belum lengkap — user ga perlu baca preface
  // dulu, langsung dibawa ke flow KYC. After complete, return ke sini.
  useEffect(() => {
    if (authLoading) return;

    // Belum login? Skip check, biarkan handleLanjut yang handle redirect login.
    // [S2-#2] Anon short-circuit DI SINI = NOL redirect → route publik aman dibaca anon/crawler.
    if (!user || !token) {
      setKycChecking(false);
      return;
    }

    const checkProfile = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/me/creator-profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          // Kalau API error, biarkan user lanjut — error akan muncul di backend
          setKycComplete(true);
          return;
        }

        const json = await res.json();
        const isComplete = json?.data?.is_complete === true;
        setKycComplete(isComplete);

        // Auto-redirect kalau belum lengkap (cuma untuk user login)
        if (!isComplete) {
          router.replace(
            `/owner/profile/complete?return=${encodeURIComponent(RETURN_PATH)}`
          );
        }
      } catch {
        // Network error — biarkan user lanjut, backend tetap akan block
        setKycComplete(true);
      } finally {
        setKycChecking(false);
      }
    };

    checkProfile();
  }, [authLoading, user, token, router]);

  // ⭐ Sprint C1: Submit + create draft + redirect ke /[id]/edit
  // Filosofi: /info = pre-flight check, klik "Saya siap" = commit untuk create draft.
  // Backend createMyDraft butuh title minimum → auto-generate placeholder.
  // User customize title + semua field di /[id]/edit page.
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleLanjut = async () => {
    if (!agreed) return;
    if (!user) {
      router.push(`/login?redirect=${RETURN_PATH}`);
      return;
    }
    // Defensive: kalau KYC belum lengkap (race condition), redirect ke complete
    if (kycComplete === false) {
      router.push(
        `/owner/profile/complete?return=${encodeURIComponent(RETURN_PATH)}`
      );
      return;
    }

    // ⭐ Auto-create draft + redirect ke /edit
    setCreating(true);
    setCreateError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

      // ⭐ FIX-DUPLICATE-DRAFT: Smart check — re-use existing empty draft kalau ada.
      // Mencegah user create banyak draft kosong saat klik "Saya Siap" berkali-kali.
      // Kriteria "empty draft":
      //   - Title masih placeholder "Kampanye Baru —*"
      //   - beneficiary_name kosong/null (tanda user belum isi data apapun)
      try {
        const listRes = await fetch(
          `${apiUrl}/funding/my/campaigns?status=draft&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const listJson = await listRes.json();

        if (listRes.ok && listJson.success && Array.isArray(listJson.data)) {
          const emptyDraft = listJson.data.find((c: any) =>
            typeof c.title === 'string' &&
            c.title.startsWith('Kampanye Baru —') &&
            (!c.beneficiary_name || c.beneficiary_name.trim() === '')
          );

          if (emptyDraft) {
            // Re-use existing empty draft, JANGAN create new
            router.push(`/owner/funding/campaigns/${emptyDraft.id}/edit`);
            return;
          }
        }
      } catch (checkErr) {
        // Non-blocking: kalau check gagal (network/etc), tetap lanjut create new
        console.warn('[galang-dana] empty draft check failed, proceeding with new', checkErr);
      }

      // No empty draft — create new
      // Generate placeholder title with current date
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      const placeholderTitle = `Kampanye Baru — ${dateStr}`;

      const res = await fetch(`${apiUrl}/funding/my/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: placeholderTitle }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Profile incomplete (race condition with KYC check)
        if (json?.error?.code === 'PROFILE_INCOMPLETE') {
          router.push(
            `/owner/profile/complete?return=${encodeURIComponent(RETURN_PATH)}`
          );
          return;
        }
        throw new Error(json?.error?.message ?? 'Gagal membuat draft kampanye');
      }

      const draftId = json.data?.id;
      if (!draftId) {
        throw new Error('Server tidak mengembalikan ID draft kampanye');
      }

      // Sukses → redirect ke /[id]/edit untuk lengkapi form (edit tetap di /owner, gated)
      router.push(`/owner/funding/campaigns/${draftId}/edit`);
    } catch (err: any) {
      console.error('[galang-dana] create draft failed:', err);
      setCreateError(
        err?.message ?? 'Terjadi kesalahan saat membuat draft. Silakan coba lagi.'
      );
      setCreating(false);
    }
  };

  // [S2-#1/#2] COMPACT loader di slot aksi (BUKAN min-h-screen). Info section tetap render.
  // Anon TIDAK ke-block: gate cuma nyala kalau authLoading, atau (login & lagi cek/redirect KYC).
  const blocking = authLoading || (!!user && kycChecking) || (!!user && kycComplete === false);
  if (blocking) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-[#003526]" size={20} />
        <p className="text-sm text-gray-600">
          {kycComplete === false ? 'Mengarahkan ke halaman verifikasi...' : 'Memuat...'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-bold text-gray-800">Persetujuan</h2>

      <label className="flex cursor-pointer items-start gap-3 bg-gray-50 rounded-xl p-4">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#EC4899] shrink-0" />
        <span className="text-sm text-gray-700 leading-relaxed">
          Saya memahami dan menyetujui semua syarat, ketentuan, dan komitmen transparansi BADONASI TeraLoka di atas. Saya bertanggung jawab penuh atas kebenaran informasi dan penggunaan dana yang saya galang.
        </span>
      </label>

      <button
        onClick={handleLanjut}
        disabled={!agreed || creating}
        className="w-full bg-gradient-to-r from-[#003526] to-[#BE185D] hover:from-[#1B6B4A] hover:to-[#EC4899] text-white py-4 rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        {creating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Membuat draft kampanye...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg">volunteer_activism</span>
            {user ? 'Saya Siap, Lanjut Buat Campaign →' : 'Login & Lanjut Buat Campaign →'}
          </>
        )}
      </button>

      {/* ⭐ Sprint C1: Error feedback kalau create draft gagal */}
      {createError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-red-600 text-base mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-red-800 mb-0.5">Gagal membuat draft</p>
            <p className="text-xs text-red-700 leading-relaxed">{createError}</p>
          </div>
          <button
            onClick={() => setCreateError(null)}
            className="text-red-600 hover:text-red-800"
            aria-label="Tutup pesan error"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { icon: 'verified', text: 'Verifikasi Gratis' },
          { icon: 'savings', text: 'Donasi Utuh' },
          { icon: 'visibility', text: 'Transparan 100%' },
        ].map(t => (
          <div key={t.text} className="text-center">
            <span className="material-symbols-outlined text-[#EC4899] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
            <p className="text-[10px] text-gray-600 font-semibold mt-0.5 leading-tight">{t.text}</p>
          </div>
        ))}
      </div>

      {!user && (
        <p className="text-center text-xs text-gray-400">
          Belum punya akun?{' '}
          <Link href="/login" className="text-[#EC4899] font-semibold hover:underline">Daftar via WhatsApp</Link>
        </p>
      )}
    </div>
  );
}
