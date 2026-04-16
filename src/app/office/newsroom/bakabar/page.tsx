'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficeBakabarPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/office/newsroom/bakabar/hub'); }, [router]);
  return null;
}
