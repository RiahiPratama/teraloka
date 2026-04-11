'use client';

import Link from 'next/link';
import { APP_NAME } from '@/utils/brand';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#1B6B4A] text-white">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-3">
          {/* Login button — nanti diganti user avatar kalau sudah login */}
          <Link
            href="/login"
            className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium"
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}
