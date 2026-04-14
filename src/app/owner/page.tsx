'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';

export default function OwnerDashboard() {
  const { user, isLoading: loading } = useAuth();
  const [listings] = useState<any[]>([]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><p>Memuat...</p></div>;

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold">🏘️ Owner Dashboard</h1>
      <p className="text-sm text-gray-500">Kelola listing kamu</p>

      <Link
        href="/owner/new"
        className="mt-4 block w-full rounded-xl bg-[#1B6B4A] py-3 text-center text-sm font-medium text-white"
      >
        + Tambah Listing Baru
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold">{listings.length}</p>
          <p className="text-xs text-gray-500">Listing</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold">0</p>
          <p className="text-xs text-gray-500">Kontak</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold">0</p>
          <p className="text-xs text-gray-500">Review</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada listing. Tambah sekarang!</p>
          </div>
        ) : (
          listings.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{formatRupiah(item.price)}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                }`}>{item.status}</span>
              </div>
              {item.listing_tier && (
                <p className="mt-1 text-xs text-gray-400">
                  Tier: {item.listing_tier} · Fee: {item.listing_fee > 0 ? formatRupiah(item.listing_fee) + '/bln' : 'Gratis'}
                </p>
              )}
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>👁 {item.view_count} views</span>
                <span>💬 {item.contact_count} kontak</span>
                <span>⭐ {item.rating_avg}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
