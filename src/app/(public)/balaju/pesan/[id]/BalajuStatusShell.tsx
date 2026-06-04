'use client';

// src/app/(public)/balaju/pesan/[id]/BalajuStatusShell.tsx
// F7-3a — PLACEHOLDER. Konfirmasi order kebikin + tampil id.
// F7-3b: ganti dengan polling GET /rides/[id] + render per-state lengkap.

import Link from 'next/link';

const BRAND = '#1B6B4A';

export function BalajuStatusShell({ rideId }: { rideId: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <div
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-2xl text-white"
        style={{ backgroundColor: BRAND }}
      >
        ✓
      </div>
      <h1 className="text-lg font-bold text-gray-900">Pesanan dibuat!</h1>
      <p className="mt-1 text-sm text-gray-600">
        Sistem sedang mencari driver terdekat untukmu.
      </p>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
        <p className="text-xs text-gray-500">ID Pesanan</p>
        <p className="mt-0.5 break-all font-mono text-xs text-gray-700">{rideId}</p>
        <p className="mt-3 text-[11px] text-gray-400">
          Halaman status lengkap (cari driver, pilih penawaran, pantau
          perjalanan) akan tampil di sini.
        </p>
      </div>

      <Link
        href="/balaju"
        className="mt-6 inline-block rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
      >
        ← Kembali
      </Link>
    </div>
  );
}
