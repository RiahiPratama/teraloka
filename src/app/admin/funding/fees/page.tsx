'use client';

/**
 * /admin/funding/fees — DEPRECATED standalone route.
 * Fee Settlement sekarang disatukan ke /fee-remittance (mode "Catat Manual").
 * Route ini redirect biar link lama tidak nyasar.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFeesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/funding/fee-remittance?mode=manual');
  }, [router]);
  return null;
}
