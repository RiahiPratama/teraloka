'use client';

// [BADONASI-VERIFY-DRAWER] Wrapper tipis: deep-link halaman detail donasi.
// Seluruh body verify + logika C3 di-EKSTRAK ke DonationVerifyPanel (MOVE, bukan rewrite) —
// dipakai juga oleh drawer dari list (Step 2). Satu sumber kebenaran UI verify.
// Wrapper hanya: resolve param id + auth guard. onDone → balik ke daftar (perilaku lama persis).

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import DonationVerifyPanel from '@/components/admin/funding/DonationVerifyPanel';

const ADMIN_ROLES = ['admin_funding', 'super_admin'];

export default function AdminDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();

  // Auth guard (sama persis dgn sebelum ekstraksi)
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!ADMIN_ROLES.includes(user.role)) { router.push('/'); return; }
  }, [user, authLoading, router]);

  return (
    <DonationVerifyPanel
      donationId={id}
      onDone={() => router.push('/admin/funding/donations')}
    />
  );
}
