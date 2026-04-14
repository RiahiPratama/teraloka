'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const LISTING_TYPES = [
  { key: 'kos', label: 'Kos-kosan', icon: '🏠', href: '/owner/listing/new?type=kos' },
  { key: 'properti', label: 'Properti', icon: '🏢', href: '/owner/listing/new?type=properti' },
  { key: 'kendaraan', label: 'Kendaraan', icon: '🚗', href: '/owner/listing/new?type=kendaraan' },
  { key: 'jasa', label: 'Jasa', icon: '🔧', href: '/owner/listing/new?type=jasa' },
];

export default function OwnerDashboard() {
  const { user, token, isLoading: loading } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetch(`${API}/listings/owner/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setListings(d.data ?? []); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-gray-400">Memuat...</p>
    </div>
  );

  if (!user || !token) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h2 className="text-lg font-semibold">Login Dulu</h2>
        <p className="mt-1 text-sm text-gray-500 mb-4">Kamu harus login untuk akses portal owner.</p>
        <Link href="/login" className="rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white">
          Login sekarang
        </Link>
      </div>
    </div>
  );

  const activeListings = listings.filter(l => l.status === 'active').length;
  const totalViews = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0);
  const totalContacts = listings.reduce((sum, l) => sum + (l.contact_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">Portal Mitra</h1>
        <p className="text-sm text-gray-500">Halo, {user.name ?? '+' + user.phone} 👋</p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{listings.length}</p>
          <p className="text-xs text-gray-500">Total Listing</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{totalViews}</p>
          <p className="text-xs text-gray-500">Total Views</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{totalContacts}</p>
          <p className="text-xs text-gray-500">Total Kontak</p>
        </div>
      </div>

      {/* Tombol tambah listing per tipe */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-gray-700">Daftarkan listing baru:</p>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map(t => (
            <Link key={t.key} href={t.href}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-[#1B6B4A] hover:text-[#1B6B4A]">
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* List listing milik owner */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Listing kamu:</p>
        {fetching ? (
          <p className="text-center text-sm text-gray-400 py-6">Memuat listing...</p>
        ) : listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada listing. Tambah sekarang!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.price ? formatRupiah(item.price) : 'Harga negosiasi'}
                      {item.price_period ? `/${item.price_period}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === 'active' ? 'bg-green-100 text-green-700' :
                    item.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {item.status === 'active' ? 'Aktif' : item.status === 'draft' ? 'Draft' : item.status}
                  </span>
                </div>
                {item.listing_tier && (
                  <p className="mt-1 text-xs text-gray-400">
                    Tier: {item.listing_tier} · {item.listing_fee > 0 ? formatRupiah(item.listing_fee) + '/bln' : 'Gratis'}
                  </p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  <span>👁 {item.view_count ?? 0} views</span>
                  <span>💬 {item.contact_count ?? 0} kontak</span>
                  {item.rating_avg > 0 && <span>⭐ {item.rating_avg}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
